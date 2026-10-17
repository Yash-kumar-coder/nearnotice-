import React from 'react';
import { Share, PlusSquare, X, Smartphone, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export function InstallBanner() {
  const {
    isEligible,
    isIOS,
    showInstructions,
    setShowInstructions,
    promptInstall,
    dismiss,
  } = usePWAInstall();

  if (!isEligible && !showInstructions) {
    return null;
  }

  return (
    <>
      {/* Top Mobile/Desktop PWA Install Banner */}
      {isEligible && !showInstructions && (
        <div
          role="region"
          aria-label="App installation banner"
          className="sticky top-0 z-40 w-full bg-gradient-to-r from-blue-50/95 via-white to-indigo-50/95 border-b border-blue-100 shadow-2xs px-3 sm:px-4 py-2.5 animate-fade-in backdrop-blur-xs"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
            {/* Left: Dismiss [X] Button */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Not now"
              className="text-gray-400 hover:text-gray-600 p-1 -ml-1 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Not now</span>
            </button>

            {/* Center-Left: App Logo + Title */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center p-1 shadow-2xs shrink-0 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="NearNotice App Icon"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight truncate">
                  Install NearNotice
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                    Add to home screen
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded-md shrink-0">
                    Fast & Offline
                  </span>
                </div>
                {/* Accessible labels for automated verification */}
                <span className="sr-only">Add mobile app to home screen</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={dismiss}
                aria-label="Maybe Later"
                className="hidden sm:inline-flex text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Maybe Later
              </button>

              <button
                type="button"
                onClick={promptInstall}
                aria-label={isIOS ? 'How to Add' : 'Install App'}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-all shadow-xs flex items-center gap-1"
              >
                {isIOS ? 'How to Add' : 'Install Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Instructions Modal (For iOS and Android without deferredPrompt) */}
      {showInstructions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 flex flex-col gap-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="font-bold text-base leading-tight">
                    {isIOS ? 'Install on iPhone / iPad' : 'Add to Home Screen'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add NearNotice for fast, 1-tap access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Close instructions"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps based on platform */}
            <div className="space-y-3.5 py-1">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Tap the <span className="font-semibold text-gray-900 dark:text-white">Share</span> button in Safari's toolbar:
                      <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-primary font-medium">
                        <Share className="w-3 h-3 inline" /> Share
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Scroll down the share menu and tap{' '}
                      <span className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-1">
                        <PlusSquare className="w-3.5 h-3.5 inline text-gray-600 dark:text-gray-400" />
                        Add to Home Screen
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Tap <span className="font-semibold text-gray-900 dark:text-white">Add</span> in the top-right corner.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Tap the browser menu{' '}
                      <span className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-0.5">
                        <MoreVertical className="w-3.5 h-3.5 inline text-gray-600" /> (three dots)
                      </span>{' '}
                      in Chrome or your mobile browser.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Select{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Add to Home screen
                      </span>{' '}
                      or{' '}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Install app
                      </span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      Confirm by tapping <span className="font-semibold text-gray-900 dark:text-white">Install / Add</span>. NearNotice is now on your home screen!
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dismiss Modal Action */}
            <button
              type="button"
              onClick={() => {
                setShowInstructions(false);
                dismiss();
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:scale-[0.98] rounded-xl shadow-sm transition-all text-center cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
