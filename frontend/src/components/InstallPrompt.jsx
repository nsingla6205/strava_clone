import { useEffect, useState } from 'react';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(() => localStorage.getItem('turfrun_hide_install') === '1');

  useEffect(() => {
    if (isStandalone() || hidden) return undefined;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    if (isIos()) setIosHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [hidden]);

  if (hidden || isStandalone()) return null;
  if (!deferred && !iosHint) return null;

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem('turfrun_hide_install', '1');
    setHidden(true);
  }

  return (
    <div className="install-banner">
      <div>
        <strong>Install TurfRun</strong>
        {iosHint && !deferred ? (
          <p>Tap Share → Add to Home Screen for the full app experience.</p>
        ) : (
          <p>Add it to your home screen — runs like a native app.</p>
        )}
      </div>
      <div className="install-actions">
        {deferred && (
          <button type="button" className="btn primary tiny" onClick={install}>
            Install
          </button>
        )}
        <button type="button" className="btn ghost tiny" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
