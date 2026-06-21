import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';

/**
 * Attachment Viewer Component
 * Handles display and interaction with different attachment types
 */
function AttachmentViewer({ attachment, getBlob, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);
  const blobRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    let active = true;
    const isPdf = attachment.filename.toLowerCase().endsWith('.pdf');
    setIsLoading(true);
    setError(null);

    getBlob(attachment.filename, isPdf ? 'application/pdf' : undefined)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setError('Failed to load attachment');
          setIsLoading(false);
          return;
        }
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
        setIsLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('Failed to load attachment');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [attachment, getBlob]);

  // Handle ESC key and background clicks
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleDownload = () => {
    if (blobRef.current) {
      saveAs(blobRef.current, attachment.filename);
    }
  };

  const renderAttachment = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center p-8 text-red-400">
          <p>{error}</p>
        </div>
      );
    }

    switch (attachment.type) {
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={objectUrl}
              alt={attachment.filename}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
              style={{ maxHeight: '80vh' }}
              onLoad={() => {
                console.log('Image loaded successfully');
                setIsLoading(false);
              }}
              onError={(e) => {
                console.error('Image failed to load:', e);
                setError('Failed to load image');
                setIsLoading(false);
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <video
              src={objectUrl}
              controls
              className="max-w-full max-h-full w-auto h-auto rounded-lg"
              style={{ maxHeight: '80vh' }}
              onLoadedData={() => setIsLoading(false)}
              onError={() => setError('Failed to load video')}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="p-4">
            <audio
              src={objectUrl}
              controls
              className="w-full"
              onLoadedData={() => setIsLoading(false)}
              onError={() => setError('Failed to load audio')}
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      case 'document':
        // Check if it's a PDF file
        if (attachment.filename.toLowerCase().endsWith('.pdf')) {
          return (
            <div className="w-full h-full flex flex-col">
              {/* PDF Preview */}
              <div className="flex-1 w-full h-full">
                <iframe
                  src={`${objectUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0 rounded-lg"
                  title={attachment.filename}
                  type="application/pdf"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setError('Failed to load PDF preview')}
                />
              </div>
              
              {/* PDF Controls */}
              <div className="p-4 bg-whatsapp-header border-t border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">📄</span>
                    <span className="text-sm text-gray-300">{attachment.filename}</span>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          );
        } else {
          // Other document types
          return (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-semibold mb-2">{attachment.filename}</p>
              <p className="text-gray-400 mb-4">Document preview not available</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
              >
                Download File
              </button>
            </div>
          );
        }

      default:
        return (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📎</div>
            <p className="text-lg font-semibold mb-2">{attachment.filename}</p>
            <p className="text-gray-400 mb-4">Unknown file type</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Download File
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2">
      {attachment.type === 'image' ? (
        /* Image-only view - clean and minimal */
        <div ref={modalRef} className="relative w-full h-full flex items-center justify-center">
          {/* Close button - floating */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white text-sm transition-all"
          >
            ✕
          </button>
          
          {/* Download button - floating */}
          <button
            onClick={handleDownload}
            className="absolute top-4 right-16 z-10 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white text-sm transition-all"
            title="Download"
          >
            💾
          </button>
          
          {/* Image content */}
          <div className="w-full h-full flex items-center justify-center">
            {renderAttachment()}
          </div>
        </div>
      ) : attachment.type === 'video' ? (
        /* Video-only view - clean and minimal */
        <div ref={modalRef} className="relative w-full h-full flex items-center justify-center">
          {/* Close button - floating */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white text-sm transition-all"
          >
            ✕
          </button>
          
          {/* Download button - floating */}
          <button
            onClick={handleDownload}
            className="absolute top-4 right-16 z-10 px-3 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white text-sm transition-all"
            title="Download"
          >
            💾
          </button>
          
          {/* Video content */}
          <div className="w-full h-full flex items-center justify-center">
            {renderAttachment()}
          </div>
        </div>
      ) : attachment.type === 'document' && attachment.filename.toLowerCase().endsWith('.pdf') ? (
        /* PDF view - full screen with controls */
        <div ref={modalRef} className="bg-whatsapp-gray rounded-lg w-full h-full max-w-7xl max-h-[98vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-white truncate">
              {attachment.filename}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
              >
                Download
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>

          {/* PDF Content */}
          <div className="flex-1 overflow-hidden">
            {renderAttachment()}
          </div>
        </div>
      ) : (
        /* Other attachment types - with header */
        <div ref={modalRef} className="bg-whatsapp-gray rounded-lg w-full h-full max-w-7xl max-h-[98vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-white truncate">
              {attachment.filename}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
              >
                Download
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-2">
            {renderAttachment()}
          </div>
        </div>
      )}
    </div>
  );
}

export default AttachmentViewer;