import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useVoiceToText } from '../hooks/useVoiceToText';

interface VoiceInputButtonProps {
  /**
   * Callback fired whenever new final speech text is transcribed.
   * Typically appends or updates the target text field.
   */
  onTranscript: (text: string) => void;
  /**
   * Optional callback when raw interim or full transcript changes
   */
  onInterimChange?: (interim: string) => void;
  /**
   * Current value of the input field (used for smart spacing when appending)
   */
  currentValue?: string;
  /**
   * Button size variant
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Optional custom class name
   */
  className?: string;
  /**
   * Custom title/tooltip
   */
  tooltip?: string;
  /**
   * Show text label alongside icon
   */
  showLabel?: boolean;
  label?: string;
  /**
   * HTML ID for testability
   */
  id?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onInterimChange,
  currentValue = '',
  size = 'md',
  className = '',
  tooltip = 'Click to speak (Voice-to-Text)',
  showLabel = false,
  label = 'Voice Dictate',
  id,
}) => {
  const [showErrorToast, setShowErrorToast] = useState<boolean>(false);

  const { isListening, error, isSupported, toggleListening, interimTranscript } = useVoiceToText({
    onFinalTranscript: (finalChunk) => {
      if (!finalChunk.trim()) return;

      // Smart spacing: check if currentValue ends with space, newline, or punctuation
      let newText = finalChunk.trim();
      if (currentValue && currentValue.length > 0) {
        const lastChar = currentValue[currentValue.length - 1];
        if (!/\s/.test(lastChar)) {
          newText = ' ' + newText;
        }
      }
      onTranscript(newText);
    },
    onTranscriptChange: (current) => {
      onInterimChange?.(current);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSupported) {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
      return;
    }

    toggleListening();
  };

  // Dimensions based on size variant
  const sizeClasses = {
    xs: 'p-1 text-[10px]',
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-xs',
    lg: 'px-3 py-2 text-sm',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4.5 h-4.5',
  }[size];

  return (
    <div className="relative inline-flex items-center">
      <button
        id={id}
        type="button"
        onClick={handleClick}
        className={`relative inline-flex items-center justify-center gap-1.5 rounded-lg font-sans font-medium transition-all duration-200 cursor-pointer select-none ${sizeClasses} ${
          isListening
            ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse border border-[#D4AF37]'
            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/30'
        } ${className}`}
        title={isListening ? 'Listening... Click to stop' : tooltip}
        aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
      >
        {isListening ? (
          <>
            <Mic className={`${iconSizes} text-black animate-bounce`} />
            {showLabel && <span className="font-semibold text-black tracking-wide">Listening...</span>}
            {/* Live Audio Wave Bars */}
            <span className="flex items-center gap-0.5 ml-0.5">
              <span className="w-1 h-3 bg-black rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
              <span className="w-1 h-4 bg-black rounded-full animate-[pulse_0.4s_ease-in-out_infinite_0.1s]" />
              <span className="w-1 h-2 bg-black rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s]" />
            </span>
          </>
        ) : (
          <>
            <Mic className={`${iconSizes}`} />
            {showLabel && <span>{label}</span>}
          </>
        )}
      </button>

      {/* Real-time Listening Badge / Feedback */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap bg-black/95 border border-[#D4AF37]/50 rounded-lg px-2.5 py-1 text-[11px] text-[#EED484] shadow-2xl backdrop-blur-md flex items-center gap-1.5 pointer-events-none animate-in fade-in zoom-in-95">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-sans font-medium">
            {interimTranscript ? `"${interimTranscript.slice(0, 30)}..."` : 'Listening to speech...'}
          </span>
        </div>
      )}

      {/* Error / Not Supported Tooltip */}
      {(error || showErrorToast) && (
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-40 w-52 bg-[#1A0B0B] border border-rose-500/50 rounded-lg p-2 text-[11px] text-rose-200 shadow-2xl backdrop-blur-md flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-sans">
            <p className="font-semibold text-rose-300">Voice Input Note</p>
            <p className="text-[10px] text-rose-200/80 leading-tight mt-0.5">
              {error || 'Speech recognition is not available. Please use Chrome, Edge, or Safari.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowErrorToast(false)}
            className="text-rose-400 hover:text-white"
          >
            <MicOff className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
