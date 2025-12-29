"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState(300);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  useEffect(() => {
    function handleResize() {
      setPageWidth(Math.min(window.innerWidth - 48, 800));
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 bg-gray-100 p-4 rounded-lg min-h-[500px]">
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center h-40 text-gray-500">
            Loading PDF...
          </div>
        }
        error={
          <div className="text-red-500 p-4 text-center">
            <p className="font-semibold">Failed to load PDF.</p>
            <p className="text-sm mt-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600"
              >
                Download File Instead
              </a>
            </p>
          </div>
        }
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={pageWidth}
            className="shadow-md mb-4 bg-white"
            renderAnnotationLayer={false}
            renderTextLayer={true}
          />
        ))}
      </Document>
    </div>
  );
}
