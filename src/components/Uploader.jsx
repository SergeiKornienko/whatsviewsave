import React, { useState } from 'react';
import backgroundImage from '../assets/bg-dark-BnMQztzI.png';

/**
 * Upload / landing screen. Handles file selection and drag-and-drop, then hands
 * the chosen File to `onFile`.
 */
function Uploader({ onFile, isBusy, error, onDismissError }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files) => {
    const file = files && files[0];
    if (file) onFile(file);
  };

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 bg-whatsapp-dark min-h-full"
      style={{ backgroundImage: `url("${backgroundImage}")`, backgroundRepeat: 'repeat' }}
    >
      <div className="w-full max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-red-400">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-200">Upload Error</h3>
                <p className="mt-1 text-sm text-red-300">{error}</p>
              </div>
              <button onClick={onDismissError} className="ml-auto text-red-400 hover:text-red-300">
                ✕
              </button>
            </div>
          </div>
        )}

        <div
          className={`bg-whatsapp-gray rounded-2xl p-8 shadow-2xl border-2 border-dashed mx-auto transition-all duration-200 ${
            isDragOver ? 'border-whatsapp-green bg-green-900 bg-opacity-20' : 'border-gray-700'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-whatsapp-green rounded-full flex items-center justify-center mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">
              {isBusy ? 'Processing your chat…' : 'Upload WhatsApp Chat'}
            </h3>
            <p className="text-whatsapp-meta text-lg mb-8">
              {isBusy
                ? 'Reading messages — this stays on your device'
                : isDragOver
                ? 'Drop your ZIP file here'
                : 'Drag & drop your exported ZIP here, or click to browse'}
            </p>

            <input
              type="file"
              accept=".zip"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={isBusy}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-8 py-4 bg-whatsapp-green text-white rounded-xl font-semibold cursor-pointer hover:bg-green-600 transition-all duration-200 shadow-lg ${
                isBusy ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isBusy ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Processing…
                </>
              ) : (
                'Choose ZIP File'
              )}
            </label>

            <div className="mt-8 p-4 bg-whatsapp-dark bg-opacity-50 rounded-xl border border-gray-600">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-whatsapp-green mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div className="text-left">
                  <p className="text-whatsapp-meta text-sm font-medium mb-1">100% Local &amp; Privacy-First</p>
                  <p className="text-whatsapp-meta text-xs">
                    Your data never leaves your device. No uploads, no servers, no tracking.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              In WhatsApp: open a chat → ⋮ → More → Export chat. Works with or without media.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="https://github.com/pranavkale07/whatsview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-800 text-gray-200 rounded-lg font-medium hover:bg-gray-700 hover:text-white transition-all border border-gray-600"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>View Source Code</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Uploader;
