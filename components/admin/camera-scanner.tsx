'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, SwitchCamera, TriangleAlert } from 'lucide-react';
import type { BrowserMultiFormatOneDReader } from '@zxing/browser';
import { Modal } from './modal';

/** `item` is the product name, for the list of what this scanning session added. */
type ScanResult = { ok: boolean; message: string; item?: string };
type Reader = { name: string; read: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<string> };

/** How long the same code is ignored after it's been handled, so one label isn't added twice. */
const REPEAT_COOLDOWN_MS = 2000;
/** Pause between attempts on the live video. */
const FRAME_DELAY_MS = 80;

/**
 * Reads barcodes with the phone or laptop camera and hands each one to `onScan`. It keeps scanning,
 * so several items can be billed in a row. A code that matches a product (`isKnown`) counts at once;
 * any other code must be read twice in a row, since Code 39 has no check digit and a blurry frame can
 * misread. "Take photo" uses the phone's own camera app, which focuses better, for hard labels.
 */
export function CameraScanner({
  onScan,
  isKnown,
  onClose,
}: {
  onScan: (code: string) => ScanResult;
  isKnown: (code: string) => boolean;
  onClose: () => void;
}) {
  // Each camera start gets its own <video> inside this slot, so a stale start (React runs effects
  // twice in development) never touches the live one.
  const slot = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLInputElement>(null);
  // Only the part of the picture inside this box is read, so codes elsewhere in view are ignored.
  const guide = useRef<HTMLDivElement>(null);
  const handle = useRef({ onScan, isKnown });
  handle.current = { onScan, isKnown };
  // Camera list and the one in use are refs, so finding them doesn't restart the camera.
  const cameras = useRef<MediaDeviceInfo[]>([]);
  const activeCamera = useRef('');
  const reader = useRef<Reader | null>(null);
  const [canSwitch, setCanSwitch] = useState(false);
  // Empty means the default (back camera on phones); set when the cashier switches cameras.
  const [deviceId, setDeviceId] = useState('');
  const [problem, setProblem] = useState('');
  const [starting, setStarting] = useState(true);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [added, setAdded] = useState<{ item: string; count: number }[]>([]);
  // Shown in small print so a scan that never succeeds can be diagnosed.
  const stats = useRef({ reader: '', size: '', frames: 0, seen: '' });
  const [shownStats, setShownStats] = useState(stats.current);

  function accept(code: string) {
    const result = handle.current.onScan(code);
    setLast(result);
    feedback(result.ok);
    const item = result.item;
    if (result.ok && item)
      setAdded((list) =>
        list.some((a) => a.item === item)
          ? list.map((a) => (a.item === item ? { ...a, count: a.count + 1 } : a))
          : [...list, { item, count: 1 }]
      );
  }

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    slot.current?.append(video);
    const read = { code: '', count: 0 };
    const handled = { code: '', at: 0 };
    const showStats = setInterval(() => setShownStats({ ...stats.current }), 500);
    const boxed = document.createElement('canvas');

    function decoded(code: string) {
      if (cancelled || !code) return;
      stats.current.seen = code;
      if (code !== read.code) {
        read.code = code;
        read.count = 0;
      }
      read.count++;
      if (read.count < 2 && !handle.current.isKnown(code)) return;
      const now = Date.now();
      if (code === handled.code && now - handled.at < REPEAT_COOLDOWN_MS) return;
      handled.code = code;
      handled.at = now;
      read.code = '';
      accept(code);
    }

    async function loop() {
      if (cancelled) return;
      if (video.readyState >= 2 && reader.current) {
        stats.current.frames++;
        stats.current.size = `${video.videoWidth}×${video.videoHeight}`;
        if (guide.current && cropToGuide(video, guide.current, boxed)) decoded(await reader.current.read(boxed));
      }
      if (!cancelled) timer = setTimeout(loop, FRAME_DELAY_MS);
    }

    async function start() {
      // Let a start that's cancelled straight away (development double run) end before opening the camera.
      await Promise.resolve();
      if (cancelled) return;
      setStarting(true);
      setProblem('');
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setProblem('The live camera only works when the admin is opened over https:// (or on localhost). Use Take photo instead.');
        setStarting(false);
        return;
      }
      try {
        reader.current ??= await createReader();
        stats.current.reader = reader.current.name;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const track = stream.getVideoTracks()[0];
        // Phones that support it keep refocusing, so a label held close stays sharp.
        track?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {});
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        activeCamera.current = track?.getSettings().deviceId ?? '';
        loop();
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
      clearTimeout(timer);
      clearInterval(showStats);
      stream?.getTracks().forEach((t) => t.stop());
      video.remove();
    };
  }, [deviceId]);

  function switchCamera() {
    const list = cameras.current;
    const current = list.findIndex((c) => c.deviceId === activeCamera.current);
    setDeviceId(list[(current + 1) % list.length].deviceId);
  }

  async function readPhoto(file: File) {
    setReadingPhoto(true);
    try {
      reader.current ??= await createReader();
      const code = await readImageFile(file, reader.current);
      if (code) accept(code);
      else {
        setLast({ ok: false, message: 'No barcode found in the photo. Fill the photo with the label, keep it level and sharp.' });
        feedback(false);
      }
    } catch {
      setLast({ ok: false, message: 'That photo could not be read. Try again.' });
    } finally {
      setReadingPhoto(false);
      if (photo.current) photo.current.value = '';
      // iOS pauses the live preview while the camera app is open.
      slot.current?.querySelector('video')?.play().catch(() => {});
    }
  }

  return (
    <Modal title="Scan barcode" onClose={onClose}>
      <div className="camera-scanner">
        <div className="camera-view">
          <div ref={slot} className="camera-slot" />
          {!problem && <div ref={guide} className="camera-guide" aria-hidden="true" />}
          {starting && !problem && <p className="camera-overlay">Starting camera…</p>}
          {problem && (
            <p className="camera-overlay problem" role="alert">
              <TriangleAlert size={20} /> {problem}
            </p>
          )}
        </div>
        <p key={last ? last.message + added.reduce((n, a) => n + a.count, 0) : ''} className={`camera-status ${last ? (last.ok ? 'ok' : 'miss') : ''}`} aria-live="polite">
          {readingPhoto ? (
            'Reading the photo…'
          ) : last ? (
            <>
              {last.ok ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />} {last.message}
            </>
          ) : (
            'Only the code inside the box is read. Fill the box with the label, about 10–20 cm away.'
          )}
        </p>
        {added.length > 0 && (
          <div className="camera-added">
            <b>Added to bill</b>
            {added.map((a) => (
              <span key={a.item}>
                {a.item} × {a.count}
              </span>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <label className="button outline camera-photo">
            <Camera size={16} /> Take photo
            <input
              ref={photo}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={readingPhoto}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readPhoto(file);
              }}
            />
          </label>
          {canSwitch && (
            <button type="button" className="button outline" onClick={switchCamera} disabled={starting}>
              <SwitchCamera size={16} /> Switch camera
            </button>
          )}
          <button type="button" className="button" onClick={onClose}>
            Done
          </button>
        </div>
        <small className="camera-stats">
          {shownStats.reader || 'Loading reader'} · {shownStats.size || 'no picture yet'} · {shownStats.frames} frames checked
          {shownStats.seen && ` · last read: ${shownStats.seen}`}
        </small>
      </div>
    </Modal>
  );
}

type NativeDetector = { detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

const nativeFormats = ['code_39', 'code_128', 'ean_13', 'ean_8', 'upc_a'];

/**
 * The browser's built-in detector where it can read Code 39 (Chrome on Mac and Android; far better
 * with blurry cameras and phone screens), otherwise ZXing. `read` returns '' when nothing is found.
 */
async function createReader(): Promise<Reader> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  const supported = Native ? await Native.getSupportedFormats().catch(() => [] as string[]) : [];
  if (Native && supported.includes('code_39')) {
    const detector = new Native({ formats: nativeFormats.filter((f) => supported.includes(f)) });
    return {
      name: 'Built-in reader',
      read: async (source) => {
        try {
          return (await detector.detect(source))[0]?.rawValue.trim() ?? '';
        } catch {
          return '';
        }
      },
    };
  }

  const [{ BrowserMultiFormatOneDReader: ZXingReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map<number, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const zxing: BrowserMultiFormatOneDReader = new ZXingReader(hints);
  // ZXing reads from a canvas; video frames are drawn onto this one first.
  const frame = document.createElement('canvas');
  const context = frame.getContext('2d', { willReadFrequently: true })!;
  return {
    name: 'ZXing reader',
    read: async (source) => {
      let canvas = source as HTMLCanvasElement;
      if (source instanceof HTMLVideoElement) {
        if (!source.videoWidth) return '';
        frame.width = source.videoWidth;
        frame.height = source.videoHeight;
        context.drawImage(source, 0, 0);
        canvas = frame;
      }
      try {
        return zxing.decodeFromCanvas(canvas).getText().trim();
      } catch {
        return '';
      }
    },
  };
}

/** Extra room read around the box on each side, as a share of its size, so the white margin a barcode needs isn't cut off. */
const GUIDE_MARGIN = 0.08;

/**
 * Copies the part of the video frame that's inside the on-screen box onto `canvas`. The video is
 * shown with object-fit: cover, so the box is mapped back from screen to camera pixels.
 * Returns false when there's no picture yet.
 */
function cropToGuide(video: HTMLVideoElement, box: HTMLElement, canvas: HTMLCanvasElement) {
  const { videoWidth, videoHeight } = video;
  const view = video.getBoundingClientRect();
  const area = box.getBoundingClientRect();
  if (!videoWidth || !view.width || !area.width) return false;
  const scale = Math.max(view.width / videoWidth, view.height / videoHeight);
  const offsetX = (view.width - videoWidth * scale) / 2;
  const offsetY = (view.height - videoHeight * scale) / 2;
  const padX = area.width * GUIDE_MARGIN;
  const padY = area.height * GUIDE_MARGIN;
  const left = Math.max(0, (area.left - padX - view.left - offsetX) / scale);
  const top = Math.max(0, (area.top - padY - view.top - offsetY) / scale);
  const right = Math.min(videoWidth, (area.right + padX - view.left - offsetX) / scale);
  const bottom = Math.min(videoHeight, (area.bottom + padY - view.top - offsetY) / scale);
  const width = Math.round(right - left);
  const height = Math.round(bottom - top);
  if (width < 10 || height < 10) return false;
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(video, left, top, width, height, 0, 0, width, height);
  return true;
}

/** Reads a barcode from a photo, trying it level and turned a quarter, since phone photos are often sideways. */
async function readImageFile(file: File, reader: Reader) {
  const image = await createImageBitmap(file);
  // Big phone photos are scaled down; 2000 px is plenty for a label and keeps reading quick.
  const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  for (const turned of [false, true]) {
    const canvas = document.createElement('canvas');
    canvas.width = turned ? height : width;
    canvas.height = turned ? width : height;
    const context = canvas.getContext('2d')!;
    if (turned) {
      context.translate(height, 0);
      context.rotate(Math.PI / 2);
    }
    context.drawImage(image, 0, 0, width, height);
    const code = await reader.read(canvas);
    if (code) return code;
  }
  return '';
}

function cameraProblem(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Camera access was blocked. Allow the camera for this site in your browser settings, or use Take photo.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device.';
  if (name === 'NotReadableError') return 'The camera is being used by another app. Close it and try again.';
  return 'The camera could not be started. Close this and try again, or use Take photo.';
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
