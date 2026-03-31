import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';

// Inform PDF.js where to find its worker via Vite's asset handling
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

/**
 * Loads a PDF document from a Uint8Array
 */
export const loadPdfDocument = async (uint8Array) => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc;
  } catch (error) {
    console.error('Error loading PDF Document:', error);
    throw error;
  }
};

// Track the current TextLayer and render task so we can cancel on re-render 
let currentTextLayer = null;
let currentRenderTask = null;

/**
 * Renders a specific page of a PDF document into a canvas
 */
export const renderPdfPage = async (pdfDoc, pageNum, canvas, textLayerDiv, scale = 1.0) => {
  if (!pdfDoc || !canvas) return null;

  try {
    // Cancel any in-flight renders
    if (currentRenderTask) {
      currentRenderTask.cancel();
      currentRenderTask = null;
    }
    if (currentTextLayer) {
      currentTextLayer.cancel();
      currentTextLayer = null;
    }

    const page = await pdfDoc.getPage(pageNum);
    
    // Cap pixelRatio at 2 to avoid massive canvas sizes on 3x displays
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: scale * pixelRatio });
    const cssViewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    
    // Set the actual canvas buffer size to the high-res dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Scale the canvas element back down via CSS
    canvas.style.width = `${cssViewport.width}px`;
    canvas.style.height = `${cssViewport.height}px`;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // Start canvas render and text content fetch in parallel
    const renderTask = page.render(renderContext);
    currentRenderTask = renderTask;
    const textContentPromise = textLayerDiv ? page.getTextContent() : null;

    await renderTask.promise;
    currentRenderTask = null;

    // Render the text layer using PDF.js built-in TextLayer
    if (textLayerDiv && textContentPromise) {
      // Clear old content
      textLayerDiv.innerHTML = '';
      
      const textContent = await textContentPromise;
      
      // Use PDF.js's TextLayer class for precise positioning
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: cssViewport,
      });
      
      currentTextLayer = textLayer;
      await textLayer.render();
      currentTextLayer = null;
    }

    return { 
      width: cssViewport.width, 
      height: cssViewport.height, 
    };
  } catch (error) {
    // Ignore cancellation errors
    if (error?.name === 'AbortException' || error?.message?.includes('Rendering cancelled')) {
      return null;
    }
    console.error(`Error rendering page ${pageNum}:`, error);
    throw error;
  }
};
