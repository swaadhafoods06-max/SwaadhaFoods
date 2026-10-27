'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, SwitchCamera, TriangleAlert } from 'lucide-react';
import { Modal } from './modal';

type ScanResult = { ok: boolean; message: string };

/** How long the same code is ignored after it's been handled, so one label isn't added twice. */
const REPEAT_COOLDOWN_MS = 2000;

/**
 * Reads barcodes with the phone or laptop camera and hands each one to `onScan`. It keeps scanning,
 * so several items can be billed in a row. A code must be read twice in a row before it counts,
 * because Code 39 labels have no check digit and a single blurry frame can misread.
 */
export function CameraScanner({ onScan, onClose }: { onScan: (code: string) => ScanResult; onClose: () => void }) {
  // Each camera start gets its own <video> inside this slot, so a stale start (React runs effects
  // twice in development) never touches the live one.
  const slot = useRef<HTMLDivElement>(null);
  const handle = useRef(onScan);
  handle.current = onScan;
  // Camera list and the one in use are refs, so finding them doesn't restart the camera.
  const cameras = useRef<MediaDeviceInfo[]>([]);
  const activeCamera = useRef('');
  const [canSwitch, setCanSwitch] = useState(false);
  // Empty means the default (back camera on phones); set when the cashier switches cameras.
  const [deviceId, setDeviceId] = useState('');
  const [problem, setProblem] = useState('');
  const [starting, setStarting] = useState(true);
  const [last, setLast] = useState<ScanResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    let stopReading = () => {};
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    slot.current?.append(video);
    const read = { code: '', count: 0 };
    const handled = { code: '', at: 0 };

    function decoded(code: string) {
      if (cancelled || !code) return;
      if (code !== read.code) {
        read.code = code;
        read.count = 1;
        return;
      }
      if (++read.count < 2) return;
      const now = Date.now();
      if (code === handled.code && now - handled.at < REPEAT_COOLDOWN_MS) return;
      handled.code = code;
      handled.at = now;
      read.code = '';
      const result = handle.current(code);
      setLast(result);
      feedback(result.ok);
    }

    async function start() {
      // Let a start that's cancelled straight away (development double run) end before opening the camera.
      await Promise.resolve();
      if (cancelled) return;
      setStarting(true);
      setProblem('');
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setProblem('The camera only works when the admin is opened over https:// (or on localhost).');
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        activeCamera.current = stream.getVideoTracks()[0]?.getSettings().deviceId ?? '';
        stopReading = await startReading(video, decoded);
        if (cancelled) return stopReading();
        // The camera list is only complete once permission has been granted.
        if (!cameras.current.length) {
          cameras.current = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
          if (!cancelled) setCanSwitch(cameras.current.length > 1);
        }
      } catch (e) {
        if (!cancelled) setProblem(cameraProblem(e));
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      stopReading();
      stream?.getTracks().forEach((t) => t.stop());
      video.remove();
    };
  }, [deviceId]);

  function switchCamera() {
    const list = cameras.current;
    const current = list.findIndex((c) => c.deviceId === activeCamera.current);
    setDeviceId(list[(current + 1) % list.length].deviceId);
  }

  return (
    <Modal title="Scan barcode" onClose={onClose}>
      <div className="camera-scanner">
        <div className="camera-view">
          <div ref={slot} className="camera-slot" />
          {!problem && <div className="camera-guide" aria-hidden="true" />}
          {starting && !problem && <p className="camera-overlay">Starting camera…</p>}
          {problem && (
            <p className="camera-overlay problem" role="alert">
              <TriangleAlert size={20} /> {problem}
            </p>
          )}
        </div>
        <p className={`camera-status ${last ? (last.ok ? 'ok' : 'miss') : ''}`} aria-live="polite">
          {last ? (
            <>
              {last.ok ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />} {last.message}
            </>
          ) : (
            'Hold the barcode label inside the box. Each scan is added to the bill.'
          )}
        </p>
        <div className="modal-actions">
          {canSwitch && (
            <button type="button" className="button outline" onClick={switchCamera} disabled={starting}>
              <SwitchCamera size={16} /> Switch camera
            </button>
          )}
          <button type="button" className="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

type NativeDetector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

const formats = ['code_39', 'code_128', 'ean_13', 'ean_8', 'upc_a'];

/**
 * Reads codes from the playing video and returns a function that stops reading. Uses the browser's
 * built-in detector where it can read Code 39 (Chrome on Mac and Android; far better with blurry
 * webcams and phone screens), otherwise ZXing.
 */
async function startReading(video: HTMLVideoElement, onCode: (code: string) => void): Promise<() => void> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  const supported = Native ? await Native.getSupportedFormats().catch(() => []) : [];
  if (Native && supported.includes('code_39')) {
    const detector = new Native({ formats: formats.filter((f) => supported.includes(f)) });
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (stopped) return;
      try {
        const found = await detector.detect(video);
        if (found[0] && !stopped) onCode(found[0].rawValue.trim());
      } catch {
        // A frame that can't be read; try the next one.
      }
      if (!stopped) timer = setTimeout(loop, 80);
    };
    loop();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }

  const [{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map<number, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 150 });
  const controls = await reader.decodeFromVideoElement(video, (scan) => {
    if (scan) onCode(scan.getText().trim());
  });
  return () => controls.stop();
}

function cameraProblem(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started. Close this and try again.';
}

/** A short vibration on phones and a beep, so the cashier knows the scan went through. */
function feedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 60 : [40, 60, 40]);
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = ok ? 1250 : 330;
    volume.gain.value = 0.08;
    tone.connect(volume).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + (ok ? 0.08 : 0.2));
    tone.onended = () => audio.close();
  } catch {
    // Sound and vibration are optional.
  }
}
