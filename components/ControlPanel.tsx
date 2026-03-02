import React, { useRef, useState, useCallback, memo, useMemo, useEffect } from 'react';
import { AppMode, AspectRatio, GenerationStatus, MinimaxResolution, MinimaxDuration, MinimaxModelVersion, WanModelVersion, WanResolution, WanDuration, WanSize720p, WanSize1080p, WanShotType, PixVerseMode, PixVerseResolution, PixVerseDuration, PixVerseStyle, LtxResolution, LtxDuration, LtxFps, RunwayModelVersion, RunwayRatio, RunwayDuration, KlingModelVersion, KlingAspectRatio, KlingDuration, KlingShotType, KlingMultiPromptItem, KlingElement, MagnificScaleFactor, MagnificOptimizedFor, MagnificEngine, PrecisionScaleFactor, PrecisionFlavor } from '../types';
import { Wand2, UploadCloud, X, Hash, Zap, HelpCircle, Plus, ChevronDown, ChevronRight, Shield, ShieldOff, Sparkles, Clock, Monitor, ImageIcon, Film, Volume2, VolumeX, Video, Palette, ArrowRightLeft, Link, Trash2, Users, Focus, Layers, Undo2 } from 'lucide-react';

import { useGeneration } from '../context/GenerationContext';
import { improvePrompt } from '../services/api';
import { useTranslation } from 'react-i18next';

// Tooltip 组件 - 下方显示
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = memo(({ text, children }) => (
  <div className="relative group inline-flex">
    {children}
    <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 w-56 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
      {text}
    </div>
  </div>
));

// 画面比例选项 - 带描述
const ASPECT_RATIO_OPTIONS = [
  { ratio: AspectRatio.Square, label: '1:1', nameKey: 'square' },
  { ratio: AspectRatio.Landscape, label: '16:9', nameKey: 'landscape' },
  { ratio: AspectRatio.Portrait, label: '9:16', nameKey: 'portrait' },
  { ratio: AspectRatio.Portrait_2_3, label: '2:3', nameKey: 'portrait23' },
  { ratio: AspectRatio.Traditional_3_4, label: '3:4', nameKey: 'traditional34' },
  { ratio: AspectRatio.Standard_3_2, label: '3:2', nameKey: 'standard32' },
  { ratio: AspectRatio.Classic_4_3, label: '4:3', nameKey: 'classic43' },
  { ratio: AspectRatio.Cinematic, label: '21:9', nameKey: 'cinematic' },
];

const ControlPanel: React.FC = memo(() => {
  const {
    activeMode: mode,
    imageModel,
    videoModel,
    upscaleModel, setUpscaleModel,
    // 图片创作参数
    imagePrompt, setImagePrompt,
    imageSeed, setImageSeed,
    imageAspectRatio, setImageAspectRatio,
    imageReferenceImages, setImageReferenceImages,
    imageSafetyChecker, setImageSafetyChecker,
    // 视频生成参数
    videoPrompt, setVideoPrompt,
    videoFirstFrame, setVideoFirstFrame,
    // Minimax 参数
    minimaxModelVersion, setMinimaxModelVersion,
    minimaxResolution, setMinimaxResolution,
    minimaxDuration, setMinimaxDuration,
    minimaxPromptOptimizer, setMinimaxPromptOptimizer,
    minimaxLastFrameImage, setMinimaxLastFrameImage,
    // Wan 参数
    wanModelVersion, setWanModelVersion,
    wanResolution, setWanResolution,
    wanDuration, setWanDuration,
    wanSize, setWanSize,
    wanNegativePrompt, setWanNegativePrompt,
    wanEnablePromptExpansion, setWanEnablePromptExpansion,
    wanShotType, setWanShotType,
    wanSeed, setWanSeed,
    // PixVerse 参数
    pixverseMode, setPixverseMode,
    pixverseResolution, setPixverseResolution,
    pixverseDuration, setPixverseDuration,
    pixverseNegativePrompt, setPixverseNegativePrompt,
    pixverseStyle, setPixverseStyle,
    pixverseSeed, setPixverseSeed,
    pixverseLastFrameImage, setPixverseLastFrameImage,
    // LTX 参数
    ltxResolution, setLtxResolution,
    ltxDuration, setLtxDuration,
    ltxFps, setLtxFps,
    ltxGenerateAudio, setLtxGenerateAudio,
    ltxSeed, setLtxSeed,
    // RunWay 参数
    runwayModelVersion, setRunwayModelVersion,
    runwayRatio, setRunwayRatio,
    runwayDuration, setRunwayDuration,
    runwaySeed, setRunwaySeed,
    // Kling 参数
    klingModelVersion, setKlingModelVersion,
    klingDuration, setKlingDuration,
    klingAspectRatio, setKlingAspectRatio,
    klingNegativePrompt, setKlingNegativePrompt,
    klingCfgScale, setKlingCfgScale,
    klingShotType, setKlingShotType,
    klingSeed, setKlingSeed,
    klingEndImage, setKlingEndImage,
    klingReferenceVideo, setKlingReferenceVideo,
    klingElements, setKlingElements,
    klingImageUrls, setKlingImageUrls,
    klingMultiPromptEnabled, setKlingMultiPromptEnabled,
    klingMultiPrompts, setKlingMultiPrompts,
    klingGenerateAudio, setKlingGenerateAudio,
    // 放大参数
    upscaleImage, setUpscaleImage,
    upscaleImageDimensions,
    upscalePrompt, setUpscalePrompt,
    // 创意放大参数
    magnificScaleFactor, setMagnificScaleFactor,
    magnificOptimizedFor, setMagnificOptimizedFor,
    magnificCreativity, setMagnificCreativity,
    magnificHdr, setMagnificHdr,
    magnificResemblance, setMagnificResemblance,
    magnificFractality, setMagnificFractality,
    magnificEngine, setMagnificEngine,
    // 精准放大参数
    precisionScaleFactor, setPrecisionScaleFactor,
    precisionFlavor, setPrecisionFlavor,
    precisionSharpen, setPrecisionSharpen,
    precisionSmartGrain, setPrecisionSmartGrain,
    precisionUltraDetail, setPrecisionUltraDetail,
    // Actions
    handleGenerate,
    status,
    addNotification,
    // Credits
    userCredits,
    estimatedCost,
    // TTS 参数
    ttsText, setTtsText,
    ttsVoiceId, setTtsVoiceId,
    ttsStability, setTtsStability,
    ttsSimilarityBoost, setTtsSimilarityBoost,
    ttsSpeed, setTtsSpeed,
    ttsSpeakerBoost, setTtsSpeakerBoost,
    musicPrompt, setMusicPrompt,
    musicLengthSeconds, setMusicLengthSeconds,
    sfxText, setSfxText,
    sfxDuration, setSfxDuration,
    sfxLoop, setSfxLoop,
    sfxPromptInfluence, setSfxPromptInfluence,
    sfxTranslatedText, setSfxTranslatedText
  } = useGeneration();

  const isGenerating = status === GenerationStatus.Generating;

  const [ratioDropdownOpen, setRatioDropdownOpen] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [preOptimizePrompt, setPreOptimizePrompt] = useState<string | null>(null);
  // TTS 声音数据
  const [voices, setVoices] = useState<any[]>([]);
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceFilterLang, setVoiceFilterLang] = useState('');
  const [voiceFilterGender, setVoiceFilterGender] = useState('');
  const [voiceDisplayCount, setVoiceDisplayCount] = useState(50);
  const [ttsAdvancedOpen, setTtsAdvancedOpen] = useState(false);
  const [ttsCustomVoiceMode, setTtsCustomVoiceMode] = useState(false);
  const [ttsCustomVoiceId, setTtsCustomVoiceId] = useState('');
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const { t } = useTranslation('controlPanel');
  const { t: tc } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_IMAGES = 5;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  // 加载声音数据
  useEffect(() => {
    if (mode !== AppMode.TextToSpeech || voices.length > 0) return;
    fetch('/data/voices.json').then(r => r.json()).then(setVoices).catch(() => {});
  }, [mode]);

  // 根据模式获取当前的 prompt 和 setPrompt
  const currentPrompt = mode === AppMode.ImageCreation ? imagePrompt
    : mode === AppMode.VideoGeneration ? videoPrompt
    : mode === AppMode.MusicGeneration ? musicPrompt
    : mode === AppMode.SoundEffect ? sfxText
    : upscalePrompt;

  const setCurrentPrompt = mode === AppMode.ImageCreation ? setImagePrompt
    : mode === AppMode.VideoGeneration ? setVideoPrompt
    : setUpscalePrompt;

  const handleOptimizePrompt = useCallback(async () => {
    const text = promptTextareaRef.current?.value || currentPrompt;
    if (!text.trim() || isOptimizingPrompt) return;
    const modality = mode === AppMode.VideoGeneration ? 'video' : 'image';
    setIsOptimizingPrompt(true);
    try {
      const result = await improvePrompt(text.trim(), modality);
      if (result.success && result.text) {
        setPreOptimizePrompt(text);
        setCurrentPrompt(result.text);
        if (promptTextareaRef.current) {
          promptTextareaRef.current.value = result.text;
        }
      } else {
        addNotification(t('prompt.optimizeFailed'), result.error || tc('notify.pleaseRetry'), 'error');
      }
    } catch {
      addNotification(tc('notify.networkError'), t('prompt.optimizeFailed'), 'error');
    }
    setIsOptimizingPrompt(false);
  }, [currentPrompt, mode, isOptimizingPrompt, setCurrentPrompt, addNotification]);

  const handleUndoOptimize = useCallback(() => {
    if (preOptimizePrompt === null) return;
    setCurrentPrompt(preOptimizePrompt);
    if (promptTextareaRef.current) {
      promptTextareaRef.current.value = preOptimizePrompt;
    }
    setPreOptimizePrompt(null);
  }, [preOptimizePrompt, setCurrentPrompt]);

  // 使用 useCallback 优化回调函数
  const handleRatioSelect = useCallback((ratio: AspectRatio) => {
    setImageAspectRatio(ratio);
    setRatioDropdownOpen(false);
  }, [setImageAspectRatio]);

  const toggleRatioDropdown = useCallback(() => {
    setRatioDropdownOpen(prev => !prev);
  }, []);

  // 图片创作 - 参考图片处理
  const validateAndAddReferenceImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addNotification(tc('file.typeError'), `${file.name}: ${tc('file.onlyJpgPngWebp')}`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        addNotification(tc('file.tooLarge'), `${file.name}: ${tc('file.maxSize', { size: 10 })}`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setImageReferenceImages(prev => {
        const newImages = [...prev, ...validFiles].slice(0, MAX_IMAGES);
        if (prev.length + validFiles.length > MAX_IMAGES) {
          addNotification(tc('file.imageCountLimit', { count: MAX_IMAGES }), tc('file.imageCountLimit', { count: MAX_IMAGES }), 'info');
        }
        return newImages;
      });
    }
  }, [addNotification, setImageReferenceImages]);

  const removeReferenceImage = useCallback((index: number) => {
    setImageReferenceImages(prev => prev.filter((_, i) => i !== index));
  }, [setImageReferenceImages]);

  // 视频生成 - 首帧图片处理
  const handleFirstFrameUpload = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 10 }), 'error');
      return;
    }

    // Minimax 特殊限制：短边 > 300px，宽高比在 2:5 ~ 5:2 之间，最大 20MB
    if (videoModel === 'minimax') {
      if (file.size > 20 * 1024 * 1024) {
        addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 20 }), 'error');
        return;
      }
      // 检查图片尺寸
      const img = new Image();
      const url = URL.createObjectURL(file);
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(tc('status.loadFailed')));
          img.src = url;
        });
        const minSide = Math.min(img.width, img.height);
        const ratio = img.width / img.height;
        URL.revokeObjectURL(url);

        if (minSide <= 300) {
          addNotification(tc('file.tooLarge'), t('minimax.minSideError'), 'error');
          return;
        }
        if (ratio < 0.4 || ratio > 2.5) {
          addNotification(tc('file.typeError'), t('minimax.ratioError'), 'error');
          return;
        }
      } catch {
        URL.revokeObjectURL(url);
        addNotification(tc('status.failed'), tc('status.loadFailed'), 'error');
        return;
      }
    }

    setVideoFirstFrame(file);
  }, [addNotification, setVideoFirstFrame, videoModel]);

  const removeFirstFrame = useCallback(() => {
    setVideoFirstFrame(null);
  }, [setVideoFirstFrame]);

  // 放大 - 图片处理（限制 50MB）
  const UPSCALE_MAX_FILE_SIZE = 50 * 1024 * 1024;
  const handleUpscaleImageUpload = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > UPSCALE_MAX_FILE_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 50 }), 'error');
      return;
    }
    setUpscaleImage(file);
  }, [addNotification, setUpscaleImage]);

  const removeUpscaleImage = useCallback(() => {
    setUpscaleImage(null);
  }, [setUpscaleImage]);

  // 缓存图片预览 URL
  const referenceImagePreviewUrls = useMemo(() => {
    return imageReferenceImages.map(file => URL.createObjectURL(file));
  }, [imageReferenceImages]);

  const firstFramePreviewUrl = useMemo(() => {
    return videoFirstFrame ? URL.createObjectURL(videoFirstFrame) : null;
  }, [videoFirstFrame]);

  const upscaleImagePreviewUrl = useMemo(() => {
    return upscaleImage ? URL.createObjectURL(upscaleImage) : null;
  }, [upscaleImage]);

  const lastFramePreviewUrl = useMemo(() => {
    return minimaxLastFrameImage ? URL.createObjectURL(minimaxLastFrameImage) : null;
  }, [minimaxLastFrameImage]);

  const pixverseLastFramePreviewUrl = useMemo(() => {
    return pixverseLastFrameImage ? URL.createObjectURL(pixverseLastFrameImage) : null;
  }, [pixverseLastFrameImage]);

  const klingEndImagePreviewUrl = useMemo(() => {
    return klingEndImage ? URL.createObjectURL(klingEndImage) : null;
  }, [klingEndImage]);

  // 清理旧的 URL
  useEffect(() => {
    return () => {
      referenceImagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [referenceImagePreviewUrls]);

  useEffect(() => {
    return () => {
      if (firstFramePreviewUrl) URL.revokeObjectURL(firstFramePreviewUrl);
    };
  }, [firstFramePreviewUrl]);

  useEffect(() => {
    return () => {
      if (upscaleImagePreviewUrl) URL.revokeObjectURL(upscaleImagePreviewUrl);
    };
  }, [upscaleImagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (lastFramePreviewUrl) URL.revokeObjectURL(lastFramePreviewUrl);
    };
  }, [lastFramePreviewUrl]);

  useEffect(() => {
    return () => {
      if (pixverseLastFramePreviewUrl) URL.revokeObjectURL(pixverseLastFramePreviewUrl);
    };
  }, [pixverseLastFramePreviewUrl]);

  useEffect(() => {
    return () => {
      if (klingEndImagePreviewUrl) URL.revokeObjectURL(klingEndImagePreviewUrl);
    };
  }, [klingEndImagePreviewUrl]);

  // Minimax 尾帧图片上传处理
  const handleLastFrameUpload = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    // Minimax 特殊限制：短边 > 300px，宽高比在 2:5 ~ 5:2 之间，最大 20MB
    if (file.size > 20 * 1024 * 1024) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 20 }), 'error');
      return;
    }
    // 检查图片尺寸
    const img = new Image();
    const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(tc('status.loadFailed')));
        img.src = url;
      });
      const minSide = Math.min(img.width, img.height);
      const ratio = img.width / img.height;
      URL.revokeObjectURL(url);

      if (minSide <= 300) {
        addNotification(tc('file.tooLarge'), t('minimax.minSideError'), 'error');
        return;
      }
      if (ratio < 0.4 || ratio > 2.5) {
        addNotification(tc('file.typeError'), t('minimax.ratioError'), 'error');
        return;
      }
    } catch {
      URL.revokeObjectURL(url);
      addNotification(tc('status.failed'), tc('status.loadFailed'), 'error');
      return;
    }

    setMinimaxLastFrameImage(file);
  }, [addNotification, setMinimaxLastFrameImage]);

  const removeLastFrameImage = useCallback(() => {
    setMinimaxLastFrameImage(null);
  }, [setMinimaxLastFrameImage]);

  // PixVerse 尾帧图片上传处理
  const pixverseLastFrameInputRef = useRef<HTMLInputElement>(null);

  const handlePixverseLastFrameUpload = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 10 }), 'error');
      return;
    }
    setPixverseLastFrameImage(file);
  }, [addNotification, setPixverseLastFrameImage]);

  const removePixverseLastFrameImage = useCallback(() => {
    setPixverseLastFrameImage(null);
  }, [setPixverseLastFrameImage]);

  // Kling 尾帧图片上传处理
  const klingEndImageInputRef = useRef<HTMLInputElement>(null);

  const handleKlingEndImageUpload = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      addNotification(tc('file.typeError'), tc('file.onlyJpgPngWebp'), 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 10 }), 'error');
      return;
    }
    setKlingEndImage(file);
  }, [addNotification, setKlingEndImage]);

  const removeKlingEndImage = useCallback(() => {
    setKlingEndImage(null);
  }, [setKlingEndImage]);

  // Kling Elements refs & handlers
  const klingElementFrontalRefs = useRef<(HTMLInputElement | null)[]>([]);
  const klingElementRefRefs = useRef<(HTMLInputElement | null)[]>([]);
  const klingImageUrlsInputRef = useRef<HTMLInputElement>(null);
  const klingReferenceVideoInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

  const handleKlingReferenceVideoUpload = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE) {
      addNotification(tc('file.tooLarge'), tc('file.maxSize', { size: 200 }), 'error');
      return;
    }
    setKlingReferenceVideo(file);
  }, [addNotification, setKlingReferenceVideo]);

  // Elements preview URLs
  const klingElementPreviews = useMemo(() => {
    return klingElements.map(el => ({
      frontal: el.frontalImage ? URL.createObjectURL(el.frontalImage) : null,
      refs: el.referenceImages.map(f => URL.createObjectURL(f)),
    }));
  }, [klingElements]);

  useEffect(() => {
    return () => {
      klingElementPreviews.forEach(p => {
        if (p.frontal) URL.revokeObjectURL(p.frontal);
        p.refs.forEach(u => URL.revokeObjectURL(u));
      });
    };
  }, [klingElementPreviews]);

  // ImageUrls preview URLs
  const klingImageUrlPreviews = useMemo(() => {
    return klingImageUrls.map(f => URL.createObjectURL(f));
  }, [klingImageUrls]);

  useEffect(() => {
    return () => { klingImageUrlPreviews.forEach(u => URL.revokeObjectURL(u)); };
  }, [klingImageUrlPreviews]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === AppMode.ImageCreation) {
        validateAndAddReferenceImages(e.dataTransfer.files);
      } else if (mode === AppMode.VideoGeneration) {
        handleFirstFrameUpload(e.dataTransfer.files);
      } else if (mode === AppMode.Upscale) {
        handleUpscaleImageUpload(e.dataTransfer.files);
      }
    }
  };

  const isGenerateDisabled = () => {
    if (isGenerating) return true;
    if (mode === AppMode.TextToSpeech) return !ttsText.trim() || !ttsVoiceId;
    if (mode === AppMode.Upscale && !upscaleImage) return true;
    if (mode === AppMode.Upscale && upscaleImageDimensions) {
      const factor = upscaleModel === 'creative'
        ? parseInt(magnificScaleFactor.replace('x', ''))
        : precisionScaleFactor;
      const totalPixels = upscaleImageDimensions.width * factor * upscaleImageDimensions.height * factor;
      if (totalPixels > 100_000_000) return true;
    }
    if (!currentPrompt && mode !== AppMode.Upscale) return true;
    return false;
  };

  const renderModelSelector = () => {
    if (mode === AppMode.TextToSpeech) return null;
    if (mode === AppMode.Upscale) {
      return (
        <div className="space-y-3 mb-6">
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider">{t('upscale.title')}</label>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setUpscaleModel('creative')}
              className={`card-interactive p-4 text-left ${upscaleModel === 'creative' ? 'border-accent bg-accent-subtle' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm text-content">{t('upscale.creative')}</span>
                {upscaleModel === 'creative' && <Zap className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-xs text-content-tertiary">{t('upscale.creativeDesc')}</p>
            </button>

            <button
              onClick={() => setUpscaleModel('precision')}
              className={`card-interactive p-4 text-left ${upscaleModel === 'precision' ? 'border-accent bg-accent-subtle' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm text-content">{t('upscale.precision')}</span>
                {upscaleModel === 'precision' && <Zap className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-xs text-content-tertiary">{t('upscale.precisionDesc')}</p>
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // TTS 面板
  const filteredVoices = useMemo(() => {
    let list = voices;
    if (voiceFilterLang) list = list.filter(v => v.language === voiceFilterLang);
    if (voiceFilterGender) list = list.filter(v => v.gender === voiceFilterGender);
    if (voiceSearch) {
      const q = voiceSearch.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(q));
    }
    return list;
  }, [voices, voiceFilterLang, voiceFilterGender, voiceSearch]);

  const voiceLanguages = useMemo(() => {
    const langs = new Set(voices.map(v => v.language));
    return [...langs].sort();
  }, [voices]);

  const handlePreviewVoice = useCallback((url: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (previewAudioUrl === url) {
      setPreviewAudioUrl(null);
      return;
    }
    setPreviewAudioUrl(url);
    const audio = new Audio(url);
    previewAudioRef.current = audio;
    audio.play().catch(() => {});
    audio.onended = () => setPreviewAudioUrl(null);
  }, [previewAudioUrl]);

  const renderTTSPanel = () => {
    if (mode !== AppMode.TextToSpeech) return null;

    return (
      <>
        {/* 文本输入 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center justify-between">
            <span>{t('tts.textLabel')}</span>
            <span className="text-content-muted normal-case">{ttsText.replace(/\n/g, '').length} / 40000</span>
          </label>
          <textarea
            value={ttsText}
            onChange={e => {
              const val = e.target.value;
              if (val.replace(/\n/g, '').length <= 40000) setTtsText(val);
            }}
            placeholder={t('tts.textPlaceholder')}
            className="input w-full h-32 resize-none text-sm"
          />
          {ttsText.length > 0 && (
            <div className="text-xs text-content-muted">
              {t('tts.estimatedCost')}: {Math.ceil(ttsText.replace(/\n/g, '').length / 1000) * 5} {tc('credits')}
              <span className="text-content-tertiary ml-1">({t('tts.pricingRule')})</span>
            </div>
          )}
        </div>

        {/* 已选声音 */}
        <div className="space-y-2 pt-4 border-t border-surface-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('tts.voiceSelect')}</div>
          {!ttsCustomVoiceMode && (
            <>
              {ttsVoiceId && voices.length > 0 && (() => {
                const v = voices.find((v: any) => v.voice_id === ttsVoiceId);
                if (!v) return null;
                return (
                  <div className="p-3 rounded-xl bg-accent-subtle border border-accent/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-accent">{v.name}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400">{v.language}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${v.gender === 'female' ? 'bg-pink-500/10 text-pink-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{v.gender === 'female' ? t('tts.female') : t('tts.male')}</span>
                          {v.age && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-hover text-content-muted">{v.age}</span>}
                        </div>
                      </div>
                      {v.preview_audio && (
                        <button
                          onClick={() => handlePreviewVoice(v.preview_audio)}
                          className={`p-2 rounded-lg shrink-0 transition-all ${previewAudioUrl === v.preview_audio ? 'bg-accent text-white' : 'bg-surface-hover/80 text-content-muted hover:text-content'}`}
                        >
                          {previewAudioUrl === v.preview_audio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
              {!ttsVoiceId && <p className="text-xs text-content-muted py-1">{t('tts.selectVoiceHint')}</p>}
            </>
          )}
        </div>

        {/* 高级参数 */}
        <div className="pt-4 border-t border-surface-border">
          <button
            onClick={() => setTtsAdvancedOpen(!ttsAdvancedOpen)}
            className="flex items-center space-x-2 text-xs text-content-secondary hover:text-content transition-colors w-full"
          >
            {ttsAdvancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <span>{t('tts.advancedSettings')}</span>
          </button>
          {ttsAdvancedOpen && (
            <div className="space-y-4 mt-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-content-muted">
                  <span className="flex items-center space-x-1">
                    <span>{t('tts.stability')}</span>
                    <Tooltip text={t('tts.stabilityDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
                  </span>
                  <span>{ttsStability.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={ttsStability} onChange={e => setTtsStability(parseFloat(e.target.value))} className="w-full accent-accent" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-content-muted">
                  <span className="flex items-center space-x-1">
                    <span>{t('tts.similarityBoost')}</span>
                    <Tooltip text={t('tts.similarityBoostDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
                  </span>
                  <span>{ttsSimilarityBoost.toFixed(1)}</span>
                </div>
                <input type="range" min="0" max="1" step="0.1" value={ttsSimilarityBoost} onChange={e => setTtsSimilarityBoost(parseFloat(e.target.value))} className="w-full accent-accent" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-content-muted">
                  <span className="flex items-center space-x-1">
                    <span>{t('tts.speed')}</span>
                    <Tooltip text={t('tts.speedDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
                  </span>
                  <span>{ttsSpeed.toFixed(1)}</span>
                </div>
                <input type="range" min="0.7" max="1.2" step="0.1" value={ttsSpeed} onChange={e => setTtsSpeed(parseFloat(e.target.value))} className="w-full accent-accent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-muted flex items-center space-x-1">
                  <span>{t('tts.speakerBoost')}</span>
                  <Tooltip text={t('tts.speakerBoostDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
                </span>
                <button
                  onClick={() => setTtsSpeakerBoost(!ttsSpeakerBoost)}
                  className={`w-9 h-5 rounded-full transition-colors ${ttsSpeakerBoost ? 'bg-accent' : 'bg-surface-border'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${ttsSpeakerBoost ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {/* 自定义 Voice ID */}
              <div className="pt-3 border-t border-surface-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-muted flex items-center space-x-1">
                    <span>{t('tts.customVoiceId')}</span>
                    <Tooltip text={t('tts.customVoiceIdHint')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
                  </span>
                  <button
                    onClick={() => {
                      setTtsCustomVoiceMode(!ttsCustomVoiceMode);
                      if (!ttsCustomVoiceMode) {
                        setTtsCustomVoiceId('');
                        setTtsVoiceId('');
                      } else {
                        setTtsCustomVoiceId('');
                      }
                    }}
                    className={`w-9 h-5 rounded-full transition-colors ${ttsCustomVoiceMode ? 'bg-accent' : 'bg-surface-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${ttsCustomVoiceMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {ttsCustomVoiceMode && (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={ttsCustomVoiceId}
                      onChange={e => { const v = e.target.value.trim(); setTtsCustomVoiceId(v); setTtsVoiceId(v); }}
                      placeholder={t('tts.customVoiceIdPlaceholder')}
                      className="input w-full text-xs"
                    />
                    <p className="text-[10px] text-content-tertiary leading-relaxed">{t('tts.customVoiceIdDesc')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // 音乐生成设置面板
  const renderMusicSettings = () => {
    if (mode !== AppMode.MusicGeneration) return null;
    return (
      <>
        {/* 提示词 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center justify-between">
            <span>{t('music.promptLabel')}</span>
            <span className="text-content-muted normal-case">{musicPrompt.length} / 2500</span>
          </label>
          <textarea
            value={musicPrompt}
            onChange={e => { if (e.target.value.length <= 2500) setMusicPrompt(e.target.value); }}
            placeholder={t('music.promptPlaceholder')}
            className="input w-full h-28 resize-none text-sm"
          />
        </div>

        {/* 时长 */}
        <div className="space-y-2 pt-4 border-t border-surface-border">
          <div className="flex justify-between items-center text-xs text-content-muted">
            <span className="flex items-center space-x-1">
              <span>{t('music.duration')}</span>
              <Tooltip text={t('music.durationDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={musicLengthSeconds}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  if (!raw) return;
                  const v = parseInt(raw);
                  if (v >= 1 && v <= 240) setMusicLengthSeconds(v);
                }}
                onBlur={() => { if (musicLengthSeconds < 10) setMusicLengthSeconds(10); }}
                className="input w-16 text-center text-xs py-1"
              />
              <span className="text-content-tertiary">{t('music.seconds')}</span>
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={240}
            step={1}
            value={musicLengthSeconds}
            onChange={e => setMusicLengthSeconds(parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* 预估消耗 */}
        <div className="pt-4 border-t border-surface-border">
          <div className="text-xs text-content-muted">
            {t('music.estimatedCost')}: {musicLengthSeconds} {tc('credits')}
            <span className="text-content-tertiary ml-1">({t('music.pricingRule')})</span>
          </div>
        </div>

        {/* 提示词技巧 */}
        <div className="pt-4 border-t border-surface-border space-y-3">
          <div className="text-xs font-medium text-content">{t('music.tips')}</div>
          <div className="grid grid-cols-1 gap-2">
            {(['tipGenre', 'tipMood', 'tipInstrument', 'tipTempo'] as const).map(key => {
              const text = t(`music.${key}`);
              const colonIdx = text.indexOf('：') !== -1 ? text.indexOf('：') : text.indexOf(':');
              const label = colonIdx !== -1 ? text.slice(0, colonIdx) : '';
              const content = colonIdx !== -1 ? text.slice(colonIdx + 1).trim() : text;
              return (
                <div key={key} className="bg-surface-hover/50 rounded-lg px-3 py-2">
                  {label && <div className="text-[11px] font-medium text-content-secondary mb-0.5">{label}</div>}
                  <div className="text-[11px] text-content-tertiary leading-relaxed">{content}</div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // 音效设置面板
  const renderSoundEffectSettings = () => {
    if (mode !== AppMode.SoundEffect) return null;
    return (
      <>
        {/* 提示词 */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center justify-between">
            <span>{t('soundEffect.promptLabel')}</span>
            <span className="text-content-muted normal-case">{sfxText.length} / 500</span>
          </label>
          <textarea
            value={sfxText}
            onChange={e => { if (e.target.value.length <= 500) { setSfxText(e.target.value); setSfxTranslatedText(''); } }}
            placeholder={t('soundEffect.promptPlaceholder')}
            className="input w-full h-24 resize-none text-sm"
          />
          <div className="text-[11px] text-content-tertiary">{t('soundEffect.autoTranslateHint')}</div>
          {sfxTranslatedText && (
            <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
              <div className="text-[11px] font-medium text-content-secondary mb-0.5">{t('soundEffect.translatedText')}</div>
              <div className="text-[11px] text-content-tertiary leading-relaxed">{sfxTranslatedText}</div>
            </div>
          )}
        </div>

        {/* 时长 */}
        <div className="space-y-2 pt-4 border-t border-surface-border">
          <div className="flex justify-between items-center text-xs text-content-muted">
            <span className="flex items-center space-x-1">
              <span>{t('soundEffect.duration')}</span>
              <Tooltip text={t('soundEffect.durationDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
            </span>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                inputMode="decimal"
                value={sfxDuration}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= 0.5 && v <= 22) setSfxDuration(v);
                }}
                onBlur={() => { if (sfxDuration < 0.5) setSfxDuration(0.5); }}
                className="input w-16 text-center text-xs py-1"
              />
              <span className="text-content-tertiary">{t('soundEffect.seconds')}</span>
            </div>
          </div>
          <input
            type="range"
            min={0.5}
            max={22}
            step={0.5}
            value={sfxDuration}
            onChange={e => setSfxDuration(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* 提示词影响力 */}
        <div className="space-y-2 pt-4 border-t border-surface-border">
          <div className="flex justify-between items-center text-xs text-content-muted">
            <span className="flex items-center space-x-1">
              <span>{t('soundEffect.promptInfluence')}</span>
              <Tooltip text={t('soundEffect.promptInfluenceDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
            </span>
            <span className="text-content-tertiary">{sfxPromptInfluence.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={sfxPromptInfluence}
            onChange={e => setSfxPromptInfluence(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        {/* 循环 */}
        <div className="pt-4 border-t border-surface-border">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center space-x-1 text-xs text-content-muted">
              <span>{t('soundEffect.loop')}</span>
              <Tooltip text={t('soundEffect.loopDesc')}><HelpCircle className="w-3 h-3 cursor-help" /></Tooltip>
            </span>
            <div
              onClick={() => setSfxLoop(!sfxLoop)}
              className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${sfxLoop ? 'bg-accent' : 'bg-surface-hover'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sfxLoop ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
          </label>
        </div>

        {/* 预估消耗 */}
        <div className="pt-4 border-t border-surface-border">
          <div className="text-xs text-content-muted">
            {t('soundEffect.estimatedCost')}: 2 {tc('credits')}
            <span className="text-content-tertiary ml-1">({t('soundEffect.pricingRule')})</span>
          </div>
        </div>
      </>
    );
  };

  // Magnific 放大设置面板
  const renderMagnificSettings = () => {
    if (mode !== AppMode.Upscale) return null;

    const scaleFactorOptions: { value: MagnificScaleFactor; label: string }[] = [
      { value: '2x', label: '2x' },
      { value: '4x', label: '4x' },
      { value: '8x', label: '8x' },
      { value: '16x', label: '16x' },
    ];

    const optimizedForOptions: { value: MagnificOptimizedFor; label: string }[] = [
      { value: 'standard', label: t('upscale.optimizedForOptions.standard') },
      { value: 'soft_portraits', label: t('upscale.optimizedForOptions.soft_portraits') },
      { value: 'hard_portraits', label: t('upscale.optimizedForOptions.hard_portraits') },
      { value: 'art_n_illustration', label: t('upscale.optimizedForOptions.art_n_illustration') },
      { value: 'videogame_assets', label: t('upscale.optimizedForOptions.videogame_assets') },
      { value: 'nature_n_landscapes', label: t('upscale.optimizedForOptions.nature_n_landscapes') },
      { value: 'films_n_photography', label: t('upscale.optimizedForOptions.films_n_photography') },
      { value: '3d_renders', label: t('upscale.optimizedForOptions.3d_renders') },
      { value: 'science_fiction_n_horror', label: t('upscale.optimizedForOptions.science_fiction_n_horror') },
    ];

    const engineOptions: { value: MagnificEngine; label: string; desc: string }[] = [
      { value: 'automatic', label: t('upscale.engineOptions.automatic'), desc: t('upscale.engineOptions.automaticDesc') },
      { value: 'magnific_illusio', label: t('upscale.engineOptions.illusio'), desc: t('upscale.engineOptions.illusioDesc') },
      { value: 'magnific_sharpy', label: t('upscale.engineOptions.sharpy'), desc: t('upscale.engineOptions.sharpyDesc') },
      { value: 'magnific_sparkle', label: t('upscale.engineOptions.sparkle'), desc: t('upscale.engineOptions.sparkleDesc') },
    ];

    const flavorOptions: { value: PrecisionFlavor; label: string; desc: string }[] = [
      { value: 'sublime', label: t('upscale.flavorOptions.sublime'), desc: t('upscale.flavorOptions.sublimeDesc') },
      { value: 'photo', label: t('upscale.flavorOptions.photo'), desc: t('upscale.flavorOptions.photoDesc') },
      { value: 'photo_denoiser', label: t('upscale.flavorOptions.photo_denoiser'), desc: t('upscale.flavorOptions.photo_denoiserDesc') },
    ];

    if (upscaleModel === 'creative') {
      return (
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('upscale.creativeSettings')}</div>

          {/* 放大倍数 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span>{t('upscale.scaleFactor')}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {scaleFactorOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setMagnificScaleFactor(option.value)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                    magnificScaleFactor === option.value
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-surface-border text-content hover:bg-surface-hover'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 优化类型 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Focus className="w-3 h-3" />
              <span>{t('upscale.optimizedFor')}</span>
            </label>
            <select
              value={magnificOptimizedFor}
              onChange={(e) => setMagnificOptimizedFor(e.target.value as MagnificOptimizedFor)}
              className="input w-full text-sm"
            >
              {optimizedForOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* 引擎选择 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>{t('upscale.engine')}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {engineOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setMagnificEngine(option.value)}
                  className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                    magnificEngine === option.value
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-surface-border text-content hover:bg-surface-hover'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-content-tertiary text-[10px]">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 创意度 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>{t('upscale.creativity')}</span>
              <Tooltip text={t('upscale.creativityDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="-10"
                max="10"
                value={magnificCreativity}
                onChange={(e) => setMagnificCreativity(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-8 text-center">{magnificCreativity}</span>
            </div>
          </div>

          {/* HDR */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.hdr')}</span>
              <Tooltip text={t('upscale.hdrDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="-10"
                max="10"
                value={magnificHdr}
                onChange={(e) => setMagnificHdr(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-8 text-center">{magnificHdr}</span>
            </div>
          </div>

          {/* 相似度 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.resemblance')}</span>
              <Tooltip text={t('upscale.resemblanceDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="-10"
                max="10"
                value={magnificResemblance}
                onChange={(e) => setMagnificResemblance(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-8 text-center">{magnificResemblance}</span>
            </div>
          </div>

          {/* 分形度 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.fractality')}</span>
              <Tooltip text={t('upscale.fractalityDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="-10"
                max="10"
                value={magnificFractality}
                onChange={(e) => setMagnificFractality(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-8 text-center">{magnificFractality}</span>
            </div>
          </div>
        </div>
      );
    } else {
      // 精准放大设置
      return (
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('upscale.precisionSettings')}</div>

          {/* 放大倍数 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span>{t('upscale.scaleFactor')}</span>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="2"
                max="16"
                value={precisionScaleFactor}
                onChange={(e) => setPrecisionScaleFactor(parseInt(e.target.value) as PrecisionScaleFactor)}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-10 text-center">{precisionScaleFactor}x</span>
            </div>
          </div>

          {/* 处理风格 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Palette className="w-3 h-3" />
              <span>{t('upscale.flavor')}</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setPrecisionFlavor('')}
                className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                  precisionFlavor === ''
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="font-medium">{t('upscale.flavorAuto')}</div>
                <div className="text-content-tertiary text-[10px]">{t('upscale.flavorAutoDesc')}</div>
              </button>
              {flavorOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPrecisionFlavor(option.value)}
                  className={`px-3 py-2 rounded-lg border text-xs text-left transition-all ${
                    precisionFlavor === option.value
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-surface-border text-content hover:bg-surface-hover'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-content-tertiary text-[10px]">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 锐化 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.sharpen')}</span>
              <Tooltip text={t('upscale.sharpenDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={precisionSharpen}
                onChange={(e) => setPrecisionSharpen(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-10 text-center">{precisionSharpen}</span>
            </div>
          </div>

          {/* {t('video.shotIntelligent')}纹理 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.smartGrain')}</span>
              <Tooltip text={t('upscale.smartGrainDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={precisionSmartGrain}
                onChange={(e) => setPrecisionSmartGrain(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-10 text-center">{precisionSmartGrain}</span>
            </div>
          </div>

          {/* 超级细节 */}
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.ultraDetail')}</span>
              <Tooltip text={t('upscale.ultraDetailDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={precisionUltraDetail}
                onChange={(e) => setPrecisionUltraDetail(parseInt(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-10 text-center">{precisionUltraDetail}</span>
            </div>
          </div>
        </div>
      );
    }
  };

  // Minimax 专属设置面板
  const renderMinimaxSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'minimax') return null;

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('minimax.title')}</div>

        {/* 模型版本选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.modelVersion')}</span>
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setMinimaxModelVersion('hailuo-2.3')}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                minimaxModelVersion === 'hailuo-2.3'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {t('minimax.hailuo23')}
            </button>
            <button
              disabled
              className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
            >
              {t('minimax.hailuo02')}
            </button>
            <button
              disabled
              className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
            >
              {t('minimax.live')}
            </button>
          </div>
        </div>

        {/* 分辨率选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.resolution')}</span>
            <Tooltip text={t('minimax.res768Note')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMinimaxResolution('768p')}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                minimaxResolution === '768p'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              768p
            </button>
            <button
              onClick={() => {
                setMinimaxResolution('1080p');
                setMinimaxDuration(6); // 1080p 只支持 6 秒
              }}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                minimaxResolution === '1080p'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              1080p
            </button>
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{t('video.duration')}</span>
            <Tooltip text={t('minimax.durationNote')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMinimaxDuration(6)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                minimaxDuration === 6
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              6s
            </button>
            <button
              onClick={() => setMinimaxDuration(10)}
              disabled={minimaxResolution === '1080p'}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                minimaxDuration === 10
                  ? 'border-accent bg-accent-subtle text-accent'
                  : minimaxResolution === '1080p'
                    ? 'border-surface-border text-content-muted cursor-not-allowed opacity-50'
                    : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              10s
            </button>
          </div>
          {minimaxResolution === '1080p' && (
            <p className="text-xs text-content-tertiary">{t('minimax.res1080Note')}</p>
          )}
        </div>

        {/* 提示词优化开关 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>{t('video.promptOptimizer')}</span>
            <Tooltip text={t('video.promptOptimizerDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <button
            onClick={() => setMinimaxPromptOptimizer(!minimaxPromptOptimizer)}
            className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
              minimaxPromptOptimizer
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>{minimaxPromptOptimizer ? t('video.on') : t('video.off')}</span>
            </div>
          </button>
        </div>

        {/* 尾帧图片上传 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <ImageIcon className="w-3 h-3" />
            <span>{t('video.lastFrame')}</span>
            <Tooltip text={t('video.lastFrameDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>

          {minimaxLastFrameImage && lastFramePreviewUrl ? (
            <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
              <img
                src={lastFramePreviewUrl}
                alt="last frame"
                className="w-full h-full object-cover"
              />
              <button
                onClick={removeLastFrameImage}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => lastFrameInputRef.current?.click()}
              className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
            >
              <input
                type="file"
                ref={lastFrameInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files) handleLastFrameUpload(e.target.files);
                  e.target.value = ''; // 重置以允许重新选择相同文件
                }}
              />
              <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
              <span className="text-xs text-content-tertiary">{t('video.firstFrameDesc')}</span>
            </div>
          )}
          {!videoFirstFrame && minimaxLastFrameImage && (
            <p className="text-xs text-orange-400">{t('video.lastFrameDesc')}</p>
          )}
        </div>
      </div>
    );
  };

  // Wan 专属设置面板
  const renderWanSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'wan') return null;

    // 根据分辨率获取可用的尺寸选项
    const sizeOptions = wanResolution === '720p'
      ? [
          { value: '1280*720' as WanSize720p, label: `1280×720 (${t('runway.ratioNames.landscape')})` },
          { value: '720*1280' as WanSize720p, label: `720×1280 (${t('runway.ratioNames.portrait')})` }
        ]
      : [
          { value: '1920*1080' as WanSize1080p, label: `1920×1080 (${t('runway.ratioNames.landscape')})` },
          { value: '1080*1920' as WanSize1080p, label: `1080×1920 (${t('runway.ratioNames.portrait')})` }
        ];

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('wan.title')}</div>

        {/* 模型版本选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.modelVersion')}</span>
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setWanModelVersion('wan-2.6')}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                wanModelVersion === 'wan-2.6'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              Wan 2.6
            </button>
            <button
              disabled
              className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
            >
              Wan 2.5 ({t('wan.deprecated')})
            </button>
            <button
              disabled
              className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
            >
              Wan 2.2 ({t('wan.deprecated')})
            </button>
          </div>
        </div>

        {/* 分辨率选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.resolution')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setWanResolution('720p');
                setWanSize('1280*720');
              }}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanResolution === '720p'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              720p
            </button>
            <button
              onClick={() => {
                setWanResolution('1080p');
                setWanSize('1920*1080');
              }}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanResolution === '1080p'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              1080p
            </button>
          </div>
        </div>

        {/* 尺寸方向选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <ImageIcon className="w-3 h-3" />
            <span>{t('video.size')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {sizeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setWanSize(option.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  wanSize === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.value.startsWith('1280') || option.value.startsWith('1920') ? t('runway.ratioNames.landscape') : t('runway.ratioNames.portrait')}
              </button>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{t('video.duration')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['5', '10', '15'] as WanDuration[]).map(d => (
              <button
                key={d}
                onClick={() => setWanDuration(d)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  wanDuration === d
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* 负面提示词 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('prompt.negative')}</span>
            <Tooltip text={t('prompt.negativePlaceholder')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <textarea
            defaultValue={wanNegativePrompt}
            onBlur={(e) => setWanNegativePrompt(e.target.value)}
            placeholder="blurry, low quality, watermark..."
            className="input w-full h-16 resize-none text-sm"
          />
        </div>

        {/* 提示词扩展开关 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>{t('wan.promptExpansion')}</span>
            <Tooltip text={t('wan.promptExpansionDesc')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <button
            onClick={() => setWanEnablePromptExpansion(!wanEnablePromptExpansion)}
            className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
              wanEnablePromptExpansion
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>{wanEnablePromptExpansion ? t('video.on') : t('video.off')}</span>
            </div>
          </button>
        </div>

        {/* 镜头类型 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('video.shotType')}</span>
            <Tooltip text={t('wan.shotTypeTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setWanShotType('single')}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanShotType === 'single'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {t('wan.singleShot')}
            </button>
            <button
              onClick={() => {
                setWanShotType('multi');
                if (!wanEnablePromptExpansion) setWanEnablePromptExpansion(true);
              }}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                wanShotType === 'multi'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              {t('wan.multiShot')}
            </button>
          </div>
          {wanShotType === 'multi' && !wanEnablePromptExpansion && (
            <p className="text-xs text-orange-400">{t('wan.multiShotRequiresExpansion')}</p>
          )}
        </div>

        {/* 随机种子 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>{t('image.seed')}</span>
            <Tooltip text={t('wan.seedTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <input
            type="number"
            defaultValue={wanSeed}
            onBlur={(e) => setWanSeed(e.target.value)}
            placeholder={t('image.seedPlaceholder')}
            min="-1"
            max="2147483647"
            className="input w-full text-xs"
          />
        </div>
      </div>
    );
  };

  // Seedance 维护提示
  const renderSeedanceSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'seedance') return null;

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('seedance.title')}</div>
        <div className="px-4 py-6 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
          <p className="text-sm text-amber-400 font-medium">Seedance 所有旧版模型渠道维护中</p>
          <p className="text-sm text-amber-400 font-medium mt-1">Seedance 2.0 将于北京时间 2 月 24 日上线</p>
        </div>
      </div>
    );
  };

  // PixVerse V5 专属设置面板
  const renderPixVerseSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'pixverse') return null;

    // 风格选项（仅 i2v 模式）
    const styleOptions: { value: PixVerseStyle | ''; label: string }[] = [
      { value: '', label: t('video.styleNone') },
      { value: 'anime', label: t('video.styleAnime') },
      { value: '3d_animation', label: t('video.style3d') },
      { value: 'clay', label: t('video.styleClay') },
      { value: 'cyberpunk', label: t('video.styleCyberpunk') },
      { value: 'comic', label: t('video.styleComic') },
    ];

    // 分辨率选项
    const resolutionOptions: { value: PixVerseResolution; label: string }[] = [
      { value: '360p', label: '360p' },
      { value: '540p', label: '540p' },
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
    ];

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('pixverse.title')}</div>

        {/* 模式选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.mode')}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPixverseMode('i2v')}
              className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center space-x-1 ${
                pixverseMode === 'i2v'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>{t('video.modeI2v')}</span>
            </button>
            <button
              onClick={() => setPixverseMode('transition')}
              className={`px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-center space-x-1 ${
                pixverseMode === 'transition'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>{t('video.modeTransition')}</span>
            </button>
          </div>
          <p className="text-xs text-content-tertiary">
            {pixverseMode === 'i2v' ? t('pixverse.i2vDesc') : t('pixverse.transitionDesc')}
          </p>
        </div>

        {/* 分辨率选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.resolution')}</span>
            <Tooltip text={t('pixverse.resolutionTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {resolutionOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setPixverseResolution(option.value);
                  // 1080p 只支持 5s
                  if (option.value === '1080p') {
                    setPixverseDuration(5);
                  }
                }}
                className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                  pixverseResolution === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{t('video.duration')}</span>
            <Tooltip text={t('pixverse.durationTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPixverseDuration(5)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                pixverseDuration === 5
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              5s
            </button>
            <button
              onClick={() => setPixverseDuration(8)}
              disabled={pixverseResolution === '1080p'}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                pixverseDuration === 8
                  ? 'border-accent bg-accent-subtle text-accent'
                  : pixverseResolution === '1080p'
                    ? 'border-surface-border text-content-muted cursor-not-allowed opacity-50'
                    : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              8s (2x)
            </button>
          </div>
        </div>

        {/* 风格选择 - 仅 i2v 模式 */}
        {pixverseMode === 'i2v' && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Palette className="w-3 h-3" />
              <span>{t('video.style')}</span>
              <Tooltip text={t('pixverse.styleTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPixverseStyle(option.value)}
                  className={`px-2 py-2 rounded-lg border text-xs transition-all ${
                    pixverseStyle === option.value
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-surface-border text-content hover:bg-surface-hover'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 尾帧图片上传 - 仅 transition 模式 */}
        {pixverseMode === 'transition' && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <ImageIcon className="w-3 h-3" />
              <span>{t('video.endImage')}</span>
              <Tooltip text={t('pixverse.lastFrameTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            {pixverseLastFrameImage && pixverseLastFramePreviewUrl ? (
              <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
                <img
                  src={pixverseLastFramePreviewUrl}
                  alt="last frame"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removePixverseLastFrameImage}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => pixverseLastFrameInputRef.current?.click()}
                className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input
                  type="file"
                  ref={pixverseLastFrameInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) handlePixverseLastFrameUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
                <span className="text-xs text-content-tertiary">{t('video.firstFrameDesc')}</span>
              </div>
            )}
          </div>
        )}

        {/* 负面提示词 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <span>{t('prompt.negative')}</span>
            <Tooltip text={t('pixverse.negativeTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <textarea
            defaultValue={pixverseNegativePrompt}
            onBlur={(e) => setPixverseNegativePrompt(e.target.value)}
            placeholder="blurry, low quality, watermark..."
            className="input w-full h-16 resize-none text-sm"
          />
        </div>

        {/* 随机种子 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>{t('image.seed')}</span>
            <Tooltip text={t('kling.seedTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <input
            type="number"
            defaultValue={pixverseSeed}
            onBlur={(e) => setPixverseSeed(e.target.value)}
            placeholder={t('image.seedPlaceholder')}
            min="-1"
            className="input w-full text-xs"
          />
        </div>

        {/* 首帧图片提示 */}
        {!videoFirstFrame && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-400">
              Please upload first frame above
            </p>
          </div>
        )}

        {/* 首尾帧模式尾帧提示 */}
        {pixverseMode === 'transition' && !pixverseLastFrameImage && videoFirstFrame && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-400">
              Please upload last frame
            </p>
          </div>
        )}
      </div>
    );
  };

  // LTX Video 2.0 Pro 专属设置面板
  const renderLtxSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'ltx') return null;

    // 分辨率选项
    const resolutionOptions: { value: LtxResolution; label: string }[] = [
      { value: '1080p', label: '1080p' },
      { value: '1440p', label: '1440p (2K)' },
      { value: '2160p', label: '2160p (4K)' },
    ];

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('ltx.title')}</div>

        {/* 模式提示 */}
        <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-xs text-accent">
            {videoFirstFrame ? t('runway.i2vMode') : t('runway.t2vMode')}
          </p>
        </div>

        {/* 分辨率选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.resolution')}</span>
            <Tooltip text={t('ltx.resolutionTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {resolutionOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setLtxResolution(option.value)}
                className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                  ltxResolution === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{t('video.duration')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([6, 8, 10] as LtxDuration[]).map(d => (
              <button
                key={d}
                onClick={() => setLtxDuration(d)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  ltxDuration === d
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* 帧率选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.fps')}</span>
            <Tooltip text={t('ltx.fpsTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLtxFps(25)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                ltxFps === 25
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              25 FPS
            </button>
            <button
              onClick={() => setLtxFps(50)}
              className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                ltxFps === 50
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              50 FPS
            </button>
          </div>
        </div>

        {/* 音频生成开关 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Volume2 className="w-3 h-3" />
            <span>{t('video.generateAudio')}</span>
            <Tooltip text={t('ltx.audioTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <button
            onClick={() => setLtxGenerateAudio(!ltxGenerateAudio)}
            className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
              ltxGenerateAudio
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {ltxGenerateAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{ltxGenerateAudio ? t('video.on') : t('video.off')}</span>
            </div>
          </button>
        </div>

        {/* 随机种子 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Hash className="w-3 h-3" />
            <span>{t('image.seed')}</span>
            <Tooltip text={t('kling.seedTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <input
            type="number"
            defaultValue={ltxSeed}
            onBlur={(e) => setLtxSeed(e.target.value)}
            placeholder={t('image.seedPlaceholder')}
            min="0"
            max="4294967295"
            className="input w-full text-xs"
          />
        </div>
      </div>
    );
  };

  // RunWay Gen 4.5 专属设置面板
  const renderRunwaySettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'runway') return null;

    // 宽高比选项
    const ratioOptions: { value: RunwayRatio; label: string; descKey: string }[] = [
      { value: '1280:720', label: '16:9', descKey: 'landscape' },
      { value: '720:1280', label: '9:16', descKey: 'portrait' },
      { value: '960:960', label: '1:1', descKey: 'square' },
      { value: '1104:832', label: '4:3', descKey: 'classicL' },
      { value: '832:1104', label: '3:4', descKey: 'classicP' },
    ];

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('runway.title')}</div>

        {/* 模型版本选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.modelVersion')}</span>
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setRunwayModelVersion('runway-4.5')}
              className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                runwayModelVersion === 'runway-4.5'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              <div className="flex justify-between items-center">
                <span>RunWay Gen 4.5</span>
                <span className="text-xs text-content-tertiary">T2V + I2V</span>
              </div>
              <p className="text-xs text-content-tertiary mt-1">{t('runway.latestDesc')}</p>
            </button>
            <button
              disabled
              className="w-full px-3 py-2 rounded-lg border text-sm text-left border-surface-border text-content-muted cursor-not-allowed opacity-50"
            >
              <div className="flex justify-between items-center">
                <span>RunWay 4 Turbo</span>
                <span className="text-xs text-content-tertiary">({t('runway.deprecated')})</span>
              </div>
            </button>
          </div>
        </div>

        {/* 模式提示 */}
        <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
          <p className="text-xs text-accent">
            {videoFirstFrame ? t('runway.i2vMode') : t('runway.t2vMode')}
          </p>
        </div>

        {/* 宽高比选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.aspectRatio')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ratioOptions.slice(0, 3).map(option => (
              <button
                key={option.value}
                onClick={() => setRunwayRatio(option.value)}
                className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                  runwayRatio === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs">{option.label}</div>
                <div className="text-xs text-content-tertiary">{t(`runway.ratioNames.${option.descKey}`)}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ratioOptions.slice(3).map(option => (
              <button
                key={option.value}
                onClick={() => setRunwayRatio(option.value)}
                className={`px-2 py-2 rounded-lg border text-sm transition-all ${
                  runwayRatio === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs">{option.label}</div>
                <div className="text-xs text-content-tertiary">{t(`runway.ratioNames.${option.descKey}`)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 时长选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{t('video.duration')}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([5, 8, 10] as RunwayDuration[]).map(d => (
              <button
                key={d}
                onClick={() => setRunwayDuration(d)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  runwayDuration === d
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* 随机种子 - 仅 I2V 模式 */}
        {videoFirstFrame && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Hash className="w-3 h-3" />
              <span>{t('image.seed')}</span>
              <Tooltip text={t('runway.seedTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <input
              type="number"
              defaultValue={runwaySeed}
              onBlur={(e) => setRunwaySeed(e.target.value)}
              placeholder={t('image.seedPlaceholder')}
              min="0"
              max="4294967295"
              className="input w-full text-xs"
            />
          </div>
        )}
      </div>
    );
  };

  // Kling 3 专属设置面板
  const renderKlingSettings = () => {
    if (mode !== AppMode.VideoGeneration || videoModel !== 'kling') return null;

    // 宽高比选项
    const aspectRatioOptions: { value: KlingAspectRatio; label: string }[] = [
      { value: '16:9', label: '16:9' },
      { value: '9:16', label: '9:16' },
      { value: '1:1', label: '1:1' },
    ];

    // Omni 模型支持 auto
    if (['kling-3-omni-pro', 'kling-3-omni-std', 'kling-3-omni-pro-v2v', 'kling-3-omni-std-v2v'].includes(klingModelVersion)) {
      aspectRatioOptions.unshift({ value: 'auto', label: 'Auto' });
    }

    const isV2V = klingModelVersion === 'kling-3-omni-pro-v2v' || klingModelVersion === 'kling-3-omni-std-v2v';
    const isOmni = klingModelVersion === 'kling-3-omni-pro' || klingModelVersion === 'kling-3-omni-std';
    const omniTotalRefs = klingElements.length + klingImageUrls.length;
    const omniLimitReached = isOmni && omniTotalRefs >= 4;

    // 两级选择：Pro/Std 档位 + 模型类型
    const klingTier: 'pro' | 'std' | '2.6-pro' = klingModelVersion === 'kling-2.6-pro' ? '2.6-pro' : (klingModelVersion.includes('-std') ? 'std' : 'pro');
    const klingType: 'base' | 'omni' | 'omni-v2v' = klingModelVersion.includes('-omni-')
      ? (klingModelVersion.endsWith('-v2v') ? 'omni-v2v' : 'omni')
      : 'base';
    const klingVersionMap: Record<string, KlingModelVersion> = {
      'pro-base': 'kling-3-pro', 'pro-omni': 'kling-3-omni-pro', 'pro-omni-v2v': 'kling-3-omni-pro-v2v',
      'std-base': 'kling-3-std', 'std-omni': 'kling-3-omni-std', 'std-omni-v2v': 'kling-3-omni-std-v2v',
    };
    const switchTier = (tier: 'pro' | 'std' | '2.6-pro') => {
      if (tier === '2.6-pro') {
        setKlingModelVersion('kling-2.6-pro');
        // 自动调整时长到 5 或 10 秒
        if (klingDuration !== 5 && klingDuration !== 10) {
          setKlingDuration(5);
        }
        // 2.6 Pro cfg_scale 最大为 1
        if (klingCfgScale > 1) {
          setKlingCfgScale(0.5);
        }
      } else {
        setKlingModelVersion(klingVersionMap[`${tier}-${klingType}`]);
      }
    };
    const switchType = (type: 'base' | 'omni' | 'omni-v2v') => setKlingModelVersion(klingVersionMap[`${klingTier}-${type}`]);

    return (
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="text-xs font-semibold uppercase tracking-wider text-gradient-accent">{t('kling.title')}</div>

        {/* 模型版本选择 */}
        <div className="space-y-3">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>{t('video.modelVersion')}</span>
          </label>

          {/* Pro / Std 档位切换 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => switchTier('pro')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                klingTier === 'pro'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              Kling 3 Pro
              <span className="block text-[10px] font-normal text-content-tertiary mt-0.5">{t('kling.proTierDesc')}</span>
            </button>
            <button
              onClick={() => switchTier('std')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                klingTier === 'std'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              Kling 3 Std
              <span className="block text-[10px] font-normal text-content-tertiary mt-0.5">{t('kling.stdTierDesc')}</span>
            </button>
            <button
              onClick={() => switchTier('2.6-pro')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                klingTier === '2.6-pro'
                  ? 'border-accent bg-accent-subtle text-accent'
                  : 'border-surface-border text-content hover:bg-surface-hover'
              }`}
            >
              Kling 2.6 Pro
              <span className="block text-[10px] font-normal text-content-tertiary mt-0.5">经济实惠</span>
            </button>
          </div>

          {/* 模型类型选择 - 仅 Kling 3 显示 */}
          {klingTier !== '2.6-pro' && (
            <div className="space-y-2">
              <button
                onClick={() => switchType('base')}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  klingType === 'base'
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>Kling 3{klingTier === 'pro' ? ' Pro' : ' Std'}</span>
                  <span className="text-xs text-content-tertiary">T2V + I2V</span>
                </div>
                <p className="text-xs text-content-tertiary mt-1">{t('kling.baseDesc')}</p>
              </button>
              <button
                onClick={() => switchType('omni')}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  klingType === 'omni'
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>Kling 3 Omni{klingTier === 'pro' ? ' Pro' : ' Std'}</span>
                  <span className="text-xs text-content-tertiary">T2V + I2V</span>
                </div>
                <p className="text-xs text-content-tertiary mt-1">{t('kling.omniDesc')}</p>
              </button>
              <button
                onClick={() => switchType('omni-v2v')}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                  klingType === 'omni-v2v'
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>Kling 3 Omni{klingTier === 'pro' ? ' Pro' : ' Std'} V2V</span>
                  <span className="text-xs text-content-tertiary">V2V</span>
                </div>
              <p className="text-xs text-content-tertiary mt-1">{t('kling.v2vDesc')}</p>
            </button>
          </div>
          )}
        </div>

        {/* V2V 模式 - 参考视频文件上传 */}
        {isV2V && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Video className="w-3 h-3" />
              <span>{t('kling.referenceVideoUpload')}</span>
              <Tooltip text={t('kling.referenceVideoUploadTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            {klingReferenceVideo ? (
              <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-surface-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-content truncate">{klingReferenceVideo.name}</p>
                  <p className="text-xs text-content-tertiary">{(klingReferenceVideo.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={() => setKlingReferenceVideo(null)} className="p-1 text-red-400 hover:bg-red-500/20 rounded ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => klingReferenceVideoInputRef.current?.click()}
                className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input
                  type="file"
                  ref={klingReferenceVideoInputRef}
                  className="hidden"
                  accept="video/mp4,video/quicktime"
                  onChange={(e) => {
                    if (e.target.files) handleKlingReferenceVideoUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
                <span className="text-xs text-content-tertiary">{t('kling.referenceVideoMaxSize')}</span>
              </div>
            )}
          </div>
        )}

        {/* 模式提示 */}
        {!isV2V && klingModelVersion !== 'kling-2.6-pro' && (
          <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
            <p className="text-xs text-accent">
              {videoFirstFrame ? t('runway.i2vMode') : t('runway.t2vMode')}
            </p>
          </div>
        )}

        {/* {t('wan.multiShot')}模式开关 - 仅 Kling 3 支持，Kling 2.6 Pro 和 V2V 不支持 */}
        {!isV2V && klingModelVersion !== 'kling-2.6-pro' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
                <Film className="w-3 h-3" />
                <span>{t('kling.multiPrompt')}</span>
                <Tooltip text={(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std')
                  ? t('kling.multiPromptTooltipPro')
                  : t('kling.multiPromptTooltip')}>
                  <HelpCircle className="w-3 h-3 cursor-help" />
                </Tooltip>
              </label>
              <button
                onClick={() => setKlingMultiPromptEnabled(!klingMultiPromptEnabled)}
                className={`px-3 py-1 rounded-lg border text-xs transition-all ${
                  klingMultiPromptEnabled
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content-muted hover:bg-surface-hover'
                }`}
              >
                {klingMultiPromptEnabled ? t('video.on') : t('video.off')}
              </button>
            </div>

            {/* {t('wan.multiShot')}编辑器 */}
            {klingMultiPromptEnabled && (
              <div className="space-y-2 p-3 bg-surface-hover rounded-lg border border-surface-border">
                {klingMultiPrompts.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-content-muted">Shot {index + 1}</span>
                      {klingMultiPrompts.length > 1 && (
                        <button
                          onClick={() => {
                            const newPrompts = klingMultiPrompts.filter((_, i) => i !== index);
                            setKlingMultiPrompts(newPrompts);
                          }}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={item.prompt}
                      onChange={(e) => {
                        const newPrompts = [...klingMultiPrompts];
                        newPrompts[index] = { ...newPrompts[index], prompt: e.target.value };
                        setKlingMultiPrompts(newPrompts);
                      }}
                      placeholder={`${t('kling.shotPrompt', { index: index + 1 })}...`}
                      className="input w-full h-16 resize-none text-xs"
                    />
                    {/* Pro/Std 版本支持每个镜头独立时长 */}
                    {(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std') && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-content-tertiary">Duration:</span>
                        <select
                          value={item.duration}
                          onChange={(e) => {
                            const newPrompts = [...klingMultiPrompts];
                            newPrompts[index] = { ...newPrompts[index], duration: e.target.value };
                            setKlingMultiPrompts(newPrompts);
                          }}
                          className="input text-xs py-1 px-2"
                        >
                          {[3,4,5,6,7,8,9,10,11,12,13,14,15].map(d => (
                            <option key={d} value={String(d)}>{d}s</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                {/* 添加镜头按钮 */}
                {klingMultiPrompts.length < 6 && (
                  <button
                    onClick={() => {
                      setKlingMultiPrompts([...klingMultiPrompts, { prompt: '', duration: '5' }]);
                    }}
                    className="w-full py-2 border-2 border-dashed border-surface-border rounded-lg text-xs text-content-muted hover:border-accent hover:text-accent transition-all flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('kling.addShot')} ({klingMultiPrompts.length}/6)</span>
                  </button>
                )}

                {/* Pro/Std 版本显示总时长 */}
                {(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std') && (
                  <div className="text-xs text-content-tertiary text-right">
                    Total: {klingMultiPrompts.reduce((sum, p) => sum + parseInt(p.duration), 0)}s
                    {klingMultiPrompts.reduce((sum, p) => sum + parseInt(p.duration), 0) > 15 && (
                      <span className="text-red-400 ml-1">(exceeds 15s limit)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 生成音频开关 */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Volume2 className="w-3 h-3" />
            <span>{t('video.generateAudio')}</span>
            <Tooltip text={t('kling.audioTooltip')}>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <button
            onClick={() => setKlingGenerateAudio(!klingGenerateAudio)}
            className={`px-3 py-1 rounded-lg border text-xs transition-all ${
              klingGenerateAudio
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-surface-border text-content-muted hover:bg-surface-hover'
            }`}
          >
            {klingGenerateAudio ? t('video.on') : t('video.off')}
          </button>
        </div>

        {/* 时长选择 - 非{t('wan.multiShot')}模式时显示 */}
        {!klingMultiPromptEnabled && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{t('video.duration')}</span>
              <Tooltip text={t('kling.durationTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              {klingModelVersion === 'kling-2.6-pro' ? (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setKlingDuration(5)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                      klingDuration === 5
                        ? 'border-accent bg-accent-subtle text-accent'
                        : 'border-surface-border text-content hover:bg-surface-hover'
                    }`}
                  >
                    5秒
                  </button>
                  <button
                    onClick={() => setKlingDuration(10)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                      klingDuration === 10
                        ? 'border-accent bg-accent-subtle text-accent'
                        : 'border-surface-border text-content hover:bg-surface-hover'
                    }`}
                  >
                    10秒
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={klingDuration}
                    onChange={(e) => setKlingDuration(parseInt(e.target.value) as KlingDuration)}
                    className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <span className="text-sm text-content w-12 text-center">{klingDuration}s</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* 宽高比选择 */}
        <div className="space-y-2">
          <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
            <Monitor className="w-3 h-3" />
            <span>{t('video.aspectRatio')}</span>
            {['kling-3-omni-pro', 'kling-3-omni-std', 'kling-3-omni-pro-v2v', 'kling-3-omni-std-v2v'].includes(klingModelVersion) && (
              <Tooltip text={t('kling.ratioTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {aspectRatioOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setKlingAspectRatio(option.value)}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  klingAspectRatio === option.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 镜头类型 - Pro/Std */}
        {(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std') && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Video className="w-3 h-3" />
              <span>{t('video.shotType')}</span>
              <Tooltip text={t('kling.shotTypeTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setKlingShotType('customize')}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  klingShotType === 'customize'
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {t('video.shotCustomize')}
              </button>
              <button
                onClick={() => setKlingShotType('intelligent')}
                className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                  klingShotType === 'intelligent'
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-surface-border text-content hover:bg-surface-hover'
                }`}
              >
                {t('video.shotIntelligent')}
              </button>
            </div>
          </div>
        )}

        {/* CFG Scale - 所有 Kling 模型都支持 */}
        {(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std' || klingModelVersion === 'kling-2.6-pro' || isV2V) && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>{t('video.cfgScale')}</span>
              <Tooltip text={t('kling.cfgScaleTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max={klingModelVersion === 'kling-2.6-pro' ? "1" : "2"}
                step="0.1"
                value={klingCfgScale}
                onChange={(e) => setKlingCfgScale(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <span className="text-sm text-content w-10 text-center">{klingCfgScale.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* 负面提示词 - 所有 Kling 模型都支持 */}
        {(klingModelVersion === 'kling-3-pro' || klingModelVersion === 'kling-3-std' || klingModelVersion === 'kling-2.6-pro' || isV2V) && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <span>{t('prompt.negative')}</span>
              <Tooltip text={t('kling.negativeTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <textarea
              defaultValue={klingNegativePrompt}
              onBlur={(e) => setKlingNegativePrompt(e.target.value)}
              placeholder="blur, distort, low quality..."
              className="input w-full h-16 resize-none text-sm"
            />
          </div>
        )}

        {/* 尾帧图片上传 - 仅 Kling 3 支持，Kling 2.6 Pro 和 V2V 不支持 */}
        {!isV2V && klingModelVersion !== 'kling-2.6-pro' && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <ImageIcon className="w-3 h-3" />
              <span>{t('video.lastFrame')}</span>
              <Tooltip text={t('kling.endImageTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            {klingEndImage && klingEndImagePreviewUrl ? (
              <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
                <img
                  src={klingEndImagePreviewUrl}
                  alt="last frame"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removeKlingEndImage}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => klingEndImageInputRef.current?.click()}
                className="w-full h-16 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input
                  type="file"
                  ref={klingEndImageInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) handleKlingEndImageUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <UploadCloud className="w-4 h-4 text-content-muted mb-1" />
                <span className="text-xs text-content-tertiary">{t('video.firstFrameDesc')}</span>
              </div>
            )}
          </div>
        )}

        {/* 角色/物体参考 Elements - Pro/Std/Omni Pro/Omni Std，非 V2V，非 2.6 Pro */}
        {!isV2V && klingModelVersion !== 'kling-2.6-pro' && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{t('kling.elements')}</span>
              <Tooltip text={t('kling.elementsTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            {klingElements.map((el, idx) => (
              <div key={idx} className="p-3 bg-surface-hover rounded-lg border border-surface-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-muted">Element {idx + 1}</span>
                  <button
                    onClick={() => setKlingElements(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* 正面照 */}
                <div className="space-y-1">
                  <span className="text-xs text-content-tertiary">{t('kling.elementFrontal')}</span>
                  {el.frontalImage && klingElementPreviews[idx]?.frontal ? (
                    <div className="relative w-16 h-16 rounded overflow-hidden group border border-surface-border inline-block">
                      <img src={klingElementPreviews[idx].frontal!} alt="frontal" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setKlingElements(prev => prev.map((e, i) => i === idx ? { ...e, frontalImage: null } : e))}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => klingElementFrontalRefs.current[idx]?.click()}
                      className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer border-surface-border hover:border-content-muted hover:bg-surface-hover"
                    >
                      <input type="file" ref={el2 => { klingElementFrontalRefs.current[idx] = el2; }} className="hidden" accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setKlingElements(prev => prev.map((e2, i) => i === idx ? { ...e2, frontalImage: f } : e2));
                          e.target.value = '';
                        }}
                      />
                      <Plus className="w-4 h-4 text-content-muted" />
                    </div>
                  )}
                </div>

                {/* 参考图 */}
                <div className="space-y-1">
                  <span className="text-xs text-content-tertiary">{t('kling.elementRef')}</span>
                  <div className="flex flex-wrap gap-2">
                    {el.referenceImages.map((_, rIdx) => (
                      <div key={rIdx} className="relative w-16 h-16 rounded overflow-hidden group border border-surface-border">
                        <img src={klingElementPreviews[idx]?.refs[rIdx] || ''} alt="ref" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setKlingElements(prev => prev.map((e2, i) => i === idx ? { ...e2, referenceImages: e2.referenceImages.filter((_, ri) => ri !== rIdx) } : e2))}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => klingElementRefRefs.current[idx]?.click()}
                      className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer border-surface-border hover:border-content-muted hover:bg-surface-hover"
                    >
                      <input type="file" ref={el2 => { klingElementRefRefs.current[idx] = el2; }} className="hidden" accept="image/jpeg,image/png,image/webp" multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setKlingElements(prev => prev.map((e2, i) => i === idx ? { ...e2, referenceImages: [...e2.referenceImages, ...files] } : e2));
                          e.target.value = '';
                        }}
                      />
                      <Plus className="w-4 h-4 text-content-muted" />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setKlingElements(prev => [...prev, { frontalImage: null, referenceImages: [] }])}
              disabled={omniLimitReached}
              className={`w-full py-2 border border-dashed border-surface-border rounded-lg text-xs text-content-muted transition-colors flex items-center justify-center space-x-1 ${omniLimitReached ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-hover'}`}
            >
              <Plus className="w-3 h-3" />
              <span>{t('kling.addElement')}</span>
            </button>
            <p className="text-xs text-content-tertiary">{t('kling.elementsHint')}</p>
          </div>
        )}

        {/* 风格参考图 Image URLs - 仅 Omni Pro/Omni Std，非 V2V */}
        {!isV2V && (klingModelVersion === 'kling-3-omni-pro' || klingModelVersion === 'kling-3-omni-std') && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Palette className="w-3 h-3" />
              <span>{t('kling.imageUrlsLabel')}</span>
              <Tooltip text={t('kling.imageUrlsTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <div className="flex flex-wrap gap-2">
              {klingImageUrls.map((_, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded overflow-hidden group border border-surface-border">
                  <img src={klingImageUrlPreviews[idx] || ''} alt="style ref" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setKlingImageUrls(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {!omniLimitReached && (
              <div
                onClick={() => klingImageUrlsInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input type="file" ref={klingImageUrlsInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setKlingImageUrls(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
                <Plus className="w-4 h-4 text-content-muted" />
              </div>
              )}
            </div>
            <p className="text-xs text-content-tertiary">{t('kling.imageUrlsHint')}</p>
          </div>
        )}

        {/* 随机种子 - 仅 Kling 3 支持，Kling 2.6 Pro 不支持 */}
        {klingModelVersion !== 'kling-2.6-pro' && (
          <div className="space-y-2">
            <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
              <Hash className="w-3 h-3" />
              <span>{t('image.seed')}</span>
              <Tooltip text={t('kling.seedTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>
            <input
              type="number"
              defaultValue={klingSeed}
              onBlur={(e) => setKlingSeed(e.target.value)}
              placeholder={t('image.seedPlaceholder')}
              min="0"
              max="4294967295"
              className="input w-full text-xs"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 h-full bg-surface-raised border-l border-surface-border flex flex-col shrink-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <div className="p-5 space-y-6 pb-6">

        {renderModelSelector()}

        {/* Prompt Input - 精准放大不需要提示词，TTS/音乐有自己的文本框 */}
        {!(mode === AppMode.Upscale && upscaleModel === 'precision') && mode !== AppMode.TextToSpeech && mode !== AppMode.MusicGeneration && mode !== AppMode.SoundEffect && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center space-x-1">
            <span>{t('prompt.label')}</span>
            <Tooltip text={
              mode === AppMode.ImageCreation ? t('prompt.imageTooltip')
              : mode === AppMode.VideoGeneration ? t('prompt.videoTooltip')
              : t('prompt.upscaleTooltip')
            }>
              <HelpCircle className="w-3 h-3 cursor-help" />
            </Tooltip>
          </label>
          <div className="relative">
            <textarea
              ref={promptTextareaRef}
              key={mode} // 切换模式时重新渲染
              defaultValue={currentPrompt}
              onBlur={(e) => setCurrentPrompt(e.target.value)}
              placeholder={mode === AppMode.Upscale ? t('prompt.upscalePlaceholder') : t('prompt.defaultPlaceholder')}
              className="input w-full h-28 resize-none text-sm pb-8"
            />
            {mode !== AppMode.Upscale && (
              <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                {preOptimizePrompt !== null && (
                  <button
                    onClick={handleUndoOptimize}
                    className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all bg-surface-hover text-content-tertiary hover:text-content"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>{t('prompt.undo')}</span>
                  </button>
                )}
                <button
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizingPrompt}
                  className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className={`w-3 h-3 ${isOptimizingPrompt ? 'animate-spin' : ''}`} />
                  <span>{isOptimizingPrompt ? t('prompt.optimizing') : t('prompt.optimize')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* 图片创作 - 参考图片上传 */}
        {mode === AppMode.ImageCreation && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center space-x-1">
              <span>{t('prompt.referenceImages')}</span>
              <Tooltip text={t('prompt.referenceImagesTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            <div
              onClick={() => imageReferenceImages.length < MAX_IMAGES && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                imageReferenceImages.length >= MAX_IMAGES
                  ? 'border-surface-border bg-surface-hover cursor-not-allowed opacity-50'
                  : 'border-surface-border hover:border-content-muted hover:bg-surface-hover'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  if (e.target.files) validateAndAddReferenceImages(e.target.files);
                  e.target.value = '';
                }}
              />
              <UploadCloud className="w-5 h-5 text-content-muted mb-1" />
              <span className="text-xs text-content-tertiary">
                {imageReferenceImages.length >= MAX_IMAGES ? t('prompt.maxReached') : t('prompt.clickOrDrag')}
              </span>
            </div>

            {imageReferenceImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {imageReferenceImages.map((file, index) => (
                  <div key={index} className="relative w-14 h-14 rounded-lg overflow-hidden group border border-surface-border">
                    <img
                      src={referenceImagePreviewUrls[index]}
                      alt={`参考图 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeReferenceImage(index)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                {imageReferenceImages.length < MAX_IMAGES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-14 h-14 rounded-lg border-2 border-dashed border-surface-border flex items-center justify-center hover:border-content-muted hover:bg-surface-hover transition-all"
                  >
                    <Plus className="w-4 h-4 text-content-muted" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 视频生成 - 首帧图片上传 */}
        {mode === AppMode.VideoGeneration && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center space-x-1">
              <span>{videoModel === 'pixverse' ? t('video.firstFrameRequired') : t('video.firstFrameOptional')}</span>
              <Tooltip text={t('video.firstFrameTooltip')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            {videoFirstFrame && firstFramePreviewUrl ? (
              <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
                <img
                  src={firstFramePreviewUrl}
                  alt="first frame"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removeFirstFrame}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) handleFirstFrameUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <UploadCloud className="w-5 h-5 text-content-muted mb-1" />
                <span className="text-xs text-content-tertiary">{t('prompt.clickOrDrag')}</span>
                {videoModel === 'kling' && <span className="text-xs text-content-tertiary">{t('kling.minImageSize')}</span>}
              </div>
            )}
          </div>
        )}

        {/* 放大 - 图片上传 */}
        {mode === AppMode.Upscale && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-content-tertiary uppercase tracking-wider flex items-center space-x-1">
              <span>{t('upscale.uploadImage')}</span>
              <Tooltip text={t('upscale.uploadImageDesc')}>
                <HelpCircle className="w-3 h-3 cursor-help" />
              </Tooltip>
            </label>

            {upscaleImage && upscaleImagePreviewUrl ? (
              <div className="relative w-full h-24 rounded-lg overflow-hidden group border border-surface-border">
                <img
                  src={upscaleImagePreviewUrl}
                  alt="upscale image"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={removeUpscaleImage}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="w-full h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all border-surface-border hover:border-content-muted hover:bg-surface-hover"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files) handleUpscaleImageUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
                <UploadCloud className="w-5 h-5 text-content-muted mb-1" />
                <span className="text-xs text-content-tertiary">{t('prompt.clickOrDrag')}</span>
              </div>
            )}

            {/* 图片分辨率信息 & 最终尺寸预估 */}
            {upscaleImage && upscaleImageDimensions && (() => {
              const { width, height } = upscaleImageDimensions;
              const factor = upscaleModel === 'creative'
                ? parseInt(magnificScaleFactor.replace('x', ''))
                : precisionScaleFactor;
              const finalW = width * factor;
              const finalH = height * factor;
              const totalPixels = finalW * finalH;
              const overLimit = totalPixels > 100_000_000;
              const maxDim = Math.max(finalW, finalH);
              const cost = maxDim <= 2048 ? 10 : maxDim <= 4096 ? 20 : 120;

              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">{t('upscale.originalSize')}</span>
                    <span className="text-content font-medium">{width} x {height}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">{t('upscale.upscaledSize')}</span>
                    <span className={`font-medium ${overLimit ? 'text-error' : 'text-accent'}`}>{finalW} x {finalH}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">{t('generate.estimatedCost', { cost: '' })}</span>
                    <span className="text-accent font-medium">{cost} {tc('credits')}</span>
                  </div>
                  {overLimit && (
                    <div className="px-3 py-2 rounded-lg bg-error/10 border border-error/30 text-xs text-error">
                      {t('upscale.overLimit', { mp: (totalPixels / 1_000_000).toFixed(0) })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 提示信息 */}
            <div className="px-3 py-2 rounded-lg bg-surface-hover text-[11px] text-content-tertiary space-y-1">
              <div>
                <UploadCloud className="w-3 h-3 inline mr-1 -mt-0.5" />
                {t('upscale.uploadNote')}
              </div>
              <div>
                <Shield className="w-3 h-3 inline mr-1 -mt-0.5" />
                {t('upscale.pixelLimit')}
              </div>
            </div>
          </div>
        )}

        {/* 图片创作高级设置 */}
        {mode === AppMode.ImageCreation && (
          <div className="space-y-5">
            {/* Aspect Ratio Dropdown */}
            <div className="space-y-2">
              <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
                <span>{t('video.aspectRatio')}</span>
                <Tooltip text={t('image.ratioTooltip')}>
                  <HelpCircle className="w-3 h-3 cursor-help" />
                </Tooltip>
              </label>
              <div className="relative">
                <button
                  onClick={toggleRatioDropdown}
                  className="input w-full text-sm flex items-center justify-between"
                >
                  <span>
                    {ASPECT_RATIO_OPTIONS.find(o => o.ratio === imageAspectRatio)?.label} - {t(`image.ratioNames.${ASPECT_RATIO_OPTIONS.find(o => o.ratio === imageAspectRatio)?.nameKey}`)}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${ratioDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {ratioDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface-overlay border border-surface-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {ASPECT_RATIO_OPTIONS.map(({ ratio, label, nameKey }) => (
                      <button
                        key={ratio}
                        onClick={() => handleRatioSelect(ratio)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors flex items-center justify-between ${
                          imageAspectRatio === ratio ? 'bg-accent-subtle text-accent' : 'text-content'
                        }`}
                      >
                        <span>{label} - {t(`image.ratioNames.${nameKey}`)}</span>
                        {imageAspectRatio === ratio && <span className="text-accent">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Seed - Banana Pro 不支持 */}
            {imageModel !== 'banana' && (
            <div className="space-y-2">
              <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
                <Hash className="w-3 h-3" />
                <span>{t('image.seed')}</span>
                <Tooltip text={t('image.seedTooltip')}>
                  <HelpCircle className="w-3 h-3 cursor-help" />
                </Tooltip>
              </label>
              <input
                type="number"
                defaultValue={imageSeed}
                onBlur={(e) => setImageSeed(e.target.value)}
                placeholder={t('image.seedPlaceholder')}
                min="0"
                max="4294967295"
                className="input w-full text-xs"
              />
            </div>
            )}

            {/* Safety Checker Toggle - Banana Pro 不支持 */}
            {imageModel !== 'banana' && (
            <div className="space-y-2">
              <label className="text-xs text-content-muted uppercase tracking-wider flex items-center space-x-1">
                <span>{t('image.safetyChecker')}</span>
                <Tooltip text={t('image.safetyCheckerTooltip')}>
                  <HelpCircle className="w-3 h-3 cursor-help" />
                </Tooltip>
              </label>
              <button
                onClick={() => setImageSafetyChecker(!imageSafetyChecker)}
                className={`w-full px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all ${
                  imageSafetyChecker
                    ? 'border-green-500/50 bg-green-500/10 text-green-400'
                    : 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {imageSafetyChecker ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                  <span>{imageSafetyChecker ? t('video.on') : t('video.off')}</span>
                </div>
              </button>
            </div>
            )}
          </div>
        )}

        {/* Minimax 专属设置 */}
        {renderMinimaxSettings()}

        {/* Wan 专属设置 */}
        {renderWanSettings()}

        {/* Seedance 专属设置 */}
        {renderSeedanceSettings()}

        {/* PixVerse 专属设置 */}
        {renderPixVerseSettings()}

        {/* LTX 专属设置 */}
        {renderLtxSettings()}

        {/* RunWay 专属设置 */}
        {renderRunwaySettings()}

        {/* Kling 专属设置 */}
        {renderKlingSettings()}

        {/* Magnific 放大设置 */}
        {renderMagnificSettings()}

        {/* TTS 模式 */}
        {mode === AppMode.TextToSpeech && renderTTSPanel()}

        {/* 音乐生成模式 */}
        {mode === AppMode.MusicGeneration && renderMusicSettings()}

        {/* 音效生成模式 */}
        {mode === AppMode.SoundEffect && renderSoundEffectSettings()}
        </div>
      </div>

      {/* Generate Button */}
      <div className="shrink-0 p-5 bg-surface-raised border-t border-surface-border">
        {/* Credits Cost Display */}
        {estimatedCost > 0 && (
          <div className="mb-3 px-3 py-2.5 rounded-lg bg-surface-overlay/50 border border-surface-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-content-tertiary flex items-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>{t('generate.estimatedCost', { cost: '' })}</span>
              </span>
              <span className="text-sm font-semibold text-content">{estimatedCost} {tc('credits')}</span>
            </div>
            {userCredits !== null && userCredits < estimatedCost && (
              <div className="mt-1.5 text-xs text-red-400 font-medium">{t('generate.insufficientCredits')} ({userCredits} {tc('credits')})</div>
            )}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={isGenerateDisabled()}
          className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center space-x-2 transition-all ${
            isGenerateDisabled()
              ? 'bg-surface-border cursor-not-allowed text-content-muted'
              : 'btn-primary'
          }`}
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{mode === AppMode.Upscale ? t('generate.upscaling') : mode === AppMode.TextToSpeech ? t('generate.ttsGenerating') : t('generate.generating')}</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>{mode === AppMode.Upscale ? t('generate.upscaleButton') : mode === AppMode.TextToSpeech ? t('generate.ttsButton') : t('generate.button')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});

ControlPanel.displayName = 'ControlPanel';

export default ControlPanel;
