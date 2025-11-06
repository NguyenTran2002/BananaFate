import React, { useState, useCallback } from 'react';
import { AppStep, BananaMetadata } from './types';
import CameraCapture from './components/CameraCapture';
import PreviewScreen from './components/PreviewScreen';
import MetadataForm from './components/MetadataForm';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { resizeImage } from './utils/imageUtils';
import { generateSignedUrl, uploadToGcs, saveMetadata, ApiError } from './utils/apiClient';
import WelcomeScreen from './components/WelcomeScreen';
import FallingBananasBackground from './components/FallingBananasBackground';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading, tokenExpiryWarning, dismissExpiryWarning } = useAuth();
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resizedImage, setResizedImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<BananaMetadata>({
    batchId: '',
    bananaId: '',
    notes: '',
    captureTime: '',
    stage: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((message: string) => {
    setError(message);
    setStep(AppStep.ERROR);
  }, []);
  
  const handleStartCapture = useCallback(() => {
    setStep(AppStep.CAPTURING);
  }, []);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setResizedImage(null);
    setMetadata({
      batchId: '',
      bananaId: '',
      notes: '',
      captureTime: '',
      stage: '',
    });
    setError(null);
    setStep(AppStep.WELCOME);
  }, []);
  
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setResizedImage(null);
    setStep(AppStep.CAPTURING);
  }, []);

  const handleCapture = useCallback(async (imageDataUrl: string) => {
    try {
      setCapturedImage(imageDataUrl);
      const resized = await resizeImage(imageDataUrl, 1024, 1024);
      setResizedImage(resized);
      setStep(AppStep.PREVIEW);
    } catch (err) {
      handleError('Failed to process image. Please try again.');
    }
  }, [handleError]);

  const handlePreviewConfirm = useCallback(() => {
    setMetadata(prev => ({
      ...prev,
      captureTime: new Date().toLocaleString(),
    }));
    setStep(AppStep.METADATA);
  }, []);

  const handleMetadataSubmit = useCallback(async (data: BananaMetadata) => {
    setMetadata(data);
    setStep(AppStep.UPLOADING);

    try {
      console.log('[UPLOAD] Starting upload process...');

      // Step 1: Generate filename with timestamp
      console.log('[UPLOAD] Step 1: Generate filename');
      const timestamp = Date.now();
      const filename = `${data.batchId}/${data.bananaId}_${timestamp}.jpg`;
      console.log('[UPLOAD] Filename:', filename);

      // Step 2: Get signed URL from backend
      console.log('[UPLOAD] Step 2: Request signed URL from backend');
      const { signedUrl, objectPath } = await generateSignedUrl(filename);
      console.log('[UPLOAD] ✓ Signed URL obtained');
      console.log('[UPLOAD] Object path:', objectPath);

      // Step 3: Convert resized image to Blob
      console.log('[UPLOAD] Step 3: Convert data URL to Blob');
      console.log('[UPLOAD] Data URL length:', resizedImage?.length || 0, 'characters');

      // FIXED: Direct base64-to-Blob conversion instead of fetch() for mobile compatibility
      const base64Data = resizedImage!.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const imageBlob = new Blob([bytes], { type: 'image/jpeg' });

      console.log('[UPLOAD] ✓ Blob created');
      console.log('[UPLOAD] Blob size:', imageBlob.size, 'bytes');
      console.log('[UPLOAD] Blob type:', imageBlob.type);

      // Step 4: Upload directly to GCS
      console.log('[UPLOAD] Step 4: Upload to GCS');
      await uploadToGcs(signedUrl, imageBlob);
      console.log('[UPLOAD] ✓ GCS upload successful');

      // Step 5: Save metadata to MongoDB
      console.log('[UPLOAD] Step 5: Save metadata to MongoDB');
      await saveMetadata({
        ...data,
        objectPath,
      });
      console.log('[UPLOAD] ✓ Metadata saved successfully');

      // Success!
      console.log('[UPLOAD] ✓ Upload complete!');
      setStep(AppStep.SUCCESS);
    } catch (error) {
      console.error('[UPLOAD] ❌ Upload failed:', error);
      console.error('[UPLOAD] Error type:', error?.constructor?.name);
      console.error('[UPLOAD] Error stack:', error instanceof Error ? error.stack : 'no stack');

      let errorMessage = 'An unknown error occurred';
      if (error instanceof ApiError) {
        errorMessage = `API Error (${error.status}): ${error.message}`;
        console.error('[UPLOAD] API Error details:', { status: error.status, message: error.message });
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.error('[UPLOAD] Standard Error:', error.message);
      }

      handleError(`Upload failed: ${errorMessage}`);
    }
  }, [resizedImage, handleError]);

  const handleStartOver = useCallback(() => {
    setCapturedImage(null);
    setResizedImage(null);
    setMetadata(prev => ({
      ...prev,
      bananaId: '',
      notes: '',
      captureTime: '',
      stage: '',
    })); // Keep batchId
    setError(null);
    setStep(AppStep.CAPTURING);
  }, []);

  const renderStep = () => {
    switch (step) {
      case AppStep.WELCOME:
        return <WelcomeScreen onStart={handleStartCapture} />;
      case AppStep.CAPTURING:
        return <CameraCapture onCapture={handleCapture} onError={handleError} onClose={handleReset} />;
      case AppStep.PREVIEW:
        return (
          resizedImage && (
            <PreviewScreen
              imageDataUrl={resizedImage}
              onConfirm={handlePreviewConfirm}
              onRetake={handleRetake}
              onClose={handleReset}
            />
          )
        );
      case AppStep.METADATA:
        return (
          resizedImage && (
            <MetadataForm
              imageDataUrl={resizedImage}
              onSubmit={handleMetadataSubmit}
              initialMetadata={metadata}
              onRecapture={handleStartOver}
              onClose={handleReset}
            />
          )
        );
      case AppStep.UPLOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
            <h2 className="text-2xl font-bold mt-4">Uploading Banana...</h2>
            <p className="text-dark-subtext mt-2">
              Submitting image and metadata to the dataset.
            </p>
          </div>
        );
      case AppStep.SUCCESS:
        return (
          <div className="w-full h-full p-6 overflow-auto no-scrollbar">
            <div className="max-w-sm mx-auto text-center w-full flex flex-col items-center justify-center space-y-4">
              {resizedImage && (
                <div className="relative inline-block">
                  <div className="bg-brand-green p-1.5 rounded-lg shadow-xl">
                    <img
                      src={resizedImage}
                      alt="Uploaded banana"
                      className="w-40 h-40 object-cover rounded-md"
                    />
                  </div>
                  <div className="absolute -top-4 -right-4 bg-brand-green rounded-full p-2 border-4 border-ocean-deep shadow-lg">
                    <CheckIcon className="w-8 h-8 text-white" />
                  </div>
                </div>
              )}
  
              <div className="text-left bg-ocean-surface/50 p-4 rounded-lg w-full">
                <h3 className="text-lg font-bold mb-3 border-b border-gray-700 pb-2 text-dark-text">
                  Banana Details
                </h3>
                <div className="space-y-1 text-sm">
                  <p><strong className="font-medium text-dark-subtext w-28 inline-block">Batch ID:</strong> {metadata.batchId}</p>
                  <p><strong className="font-medium text-dark-subtext w-28 inline-block">Banana ID:</strong> {metadata.bananaId}</p>
                  <p><strong className="font-medium text-dark-subtext w-28 inline-block">Capture Time:</strong> {metadata.captureTime}</p>
                  <p><strong className="font-medium text-dark-subtext w-28 inline-block">Stage:</strong> {metadata.stage}</p>
                  <p><strong className="font-medium text-dark-subtext w-28 inline-block">Notes:</strong> {metadata.notes || 'N/A'}</p>
                </div>
              </div>
  
              <button
                onClick={handleStartOver}
                className="w-full bg-brand-yellow text-gray-900 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors"
              >
                Capture Another
              </button>
              <button
                onClick={handleReset}
                className="font-semibold text-dark-subtext hover:text-white transition-colors py-2"
              >
                Return to Home
              </button>
            </div>
          </div>
        );
      case AppStep.ERROR:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-2xl font-bold text-red-500">An Error Occurred</h2>
            <p className="text-dark-subtext mt-2">{error}</p>
            <button
              onClick={handleStartOver}
              className="mt-8 bg-brand-yellow text-gray-900 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-yellow-400 transition-colors"
            >
              Try Again
            </button>
            <button
                onClick={handleReset}
                className="mt-4 font-semibold text-dark-subtext hover:text-white transition-colors py-2"
              >
                Return to Home
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-deep via-ocean-surface to-ocean-deep">
        <SpinnerIcon className="w-16 h-16 text-brand-yellow" />
      </main>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show main app if authenticated
  return (
    <main className="h-screen overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4 font-sans" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <FallingBananasBackground />

      {/* Token expiry warning banner */}
      {tokenExpiryWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-gray-900 p-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm font-medium">
              ⚠️ Your session will expire soon. Please complete your current upload and log in again.
            </p>
            <button
              onClick={dismissExpiryWarning}
              className="text-gray-900 hover:text-gray-700 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Outer container for shape and positioning */}
      <div className="relative z-10 w-full max-w-md h-[85vh] max-h-[600px] sm:h-[90vh] sm:max-h-[800px] mx-auto rounded-2xl shadow-2xl overflow-hidden">
        {/* Background layer for blur and color */}
        <div className="absolute inset-0 bg-ocean-surface/75 backdrop-blur-md rounded-2xl"></div>

        {/* Content layer */}
        <div className="relative z-10 h-full flex flex-col">
          <div className="p-4 sm:p-6 flex-shrink-0 border-b border-gray-700/50">
            <h1 className="text-2xl font-bold text-center text-brand-yellow">
              {step === AppStep.WELCOME ? 'Banana Fate' :
               step === AppStep.METADATA ? 'Document Banana' :
               step === AppStep.UPLOADING ? 'Uploading...' :
               step === AppStep.SUCCESS ? 'Banana Captured' : 'Capture Banana'}
            </h1>
          </div>
          <div className="flex-grow overflow-hidden">
            {renderStep()}
          </div>
        </div>
      </div>
    </main>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
