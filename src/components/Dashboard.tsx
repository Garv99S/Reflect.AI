import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  Trash2,
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Compass,
  MessageSquare,
  X,
  Image as ImageIcon,
  Upload,
  Minimize2,
  Maximize2,
  Columns,
  RotateCcw,
  Eye,
  EyeOff,
  Edit3,
  Pencil,
  StickyNote,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  Download,
  Bot,
  Database,
  Cpu,
  Layers,
  Lock,
  Shield,
  ShieldCheck,
  LogOut,
  MapPin,
  Navigation,
  ExternalLink,
  Bell,
} from 'lucide-react';
import type {
  JournalEntry,
  UserProfile,
  InteractionMessage,
  ReflectionMode,
  ImageAttachment,
  AgentRoleType,
  UserRole,
  EntryLocation,
} from '../types';
import {
  saveJournalEntry,
  deleteJournalEntry,
  subscribeToUserEntries,
  getFreshAuthBearerToken,
} from '../lib/firebase';
import { askGeminiReflection, summarizeJournalEntry } from '../lib/geminiApi';
import { AgentModal } from './AgentModal';
import { RagSearchModal } from './RagSearchModal';
import { McpHubModal } from './McpHubModal';
import { LocationPickerModal } from './LocationPickerModal';
import { NotificationsModal } from './NotificationsModal';
import { getGoogleMapsUrl } from '../lib/mapsApi';
import { EditorAiSlider } from './EditorAiSlider';
import { VoiceInputButton } from './VoiceInputButton';
import { GoogleGIcon } from './GoogleGIcon';

interface DashboardProps {
  user: UserProfile;
  newEntryTrigger?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenSecurityModal?: () => void;
  onOpenRbacConsole?: () => void;
  activeRole?: UserRole;
  onSignOut?: () => void;
}

const GUIDED_STARTERS = [
  'What is the core decision or challenge I am facing right now?',
  'Help me challenge my underlying assumptions about this situation.',
  'What are the core action items I should focus on next?',
];

// Helper to compress images client-side before storing to avoid document payload limits
async function compressImageFile(file: File): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ url: e.target?.result as string, name: file.name });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ url: dataUrl, name: file.name });
      };
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  newEntryTrigger,
  isFullscreen: isFullscreenProp,
  onToggleFullscreen,
  onOpenSecurityModal,
  onOpenRbacConsole,
  activeRole = 'user',
  onSignOut,
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [showFullscreenUserDropdown, setShowFullscreenUserDropdown] = useState<boolean>(false);
  const fullscreenHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFullscreenMouseEnter = () => {
    if (fullscreenHoverTimeoutRef.current) {
      clearTimeout(fullscreenHoverTimeoutRef.current);
      fullscreenHoverTimeoutRef.current = null;
    }
    setShowFullscreenUserDropdown(true);
  };

  const handleFullscreenMouseLeave = () => {
    if (fullscreenHoverTimeoutRef.current) {
      clearTimeout(fullscreenHoverTimeoutRef.current);
    }
    fullscreenHoverTimeoutRef.current = setTimeout(() => {
      setShowFullscreenUserDropdown(false);
    }, 120);
  };

  const roleBadgeStyle: Record<UserRole, string> = {
    owner: 'text-[#EED484] bg-[#D4AF37]/20 border-[#D4AF37]/50 hover:bg-[#D4AF37]/30',
    admin: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30',
    user: 'text-blue-300 bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30',
  };

  // Active Mobile / Tablet View Tab
  const [mobileTab, setMobileTab] = useState<'reflections' | 'editor' | 'chat'>('editor');

  // Active Entry State
  const [entryTitle, setEntryTitle] = useState('');
  const [entryContent, setEntryContent] = useState('');
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [entryMood, setEntryMood] = useState<string | undefined>();
  const [keyThemes, setKeyThemes] = useState<string[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | undefined>();
  const [entryLocation, setEntryLocation] = useState<EntryLocation | undefined>();
  const [showLocationPickerModal, setShowLocationPickerModal] = useState<boolean>(false);

  // Image Facility Layout State
  const [isImagePanelMinimized, setIsImagePanelMinimized] = useState<boolean>(false);
  const [isSideBySideView, setIsSideBySideView] = useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // Chat & AI State
  const [inputPrompt, setInputPrompt] = useState('');
  const [reflectionMode, setReflectionMode] = useState<ReflectionMode>('reflect');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Status & Error Handlers
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirmation & Lightbox Modals State
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; title: string } | null>(null);
  const [entryToRename, setEntryToRename] = useState<{ id: string; title: string } | null>(null);
  const [renameInputText, setRenameInputText] = useState<string>('');
  const [vaultName, setVaultName] = useState<string>(() => {
    try {
      return localStorage.getItem(`reflectai_vault_name_${user.uid}`) || 'Personal Sanctuary Vault';
    } catch {
      return 'Personal Sanctuary Vault';
    }
  });
  const [isRenamingVault, setIsRenamingVault] = useState<boolean>(false);
  const [vaultNameInput, setVaultNameInput] = useState<string>('');
  const [showClearHistoryModal, setShowClearHistoryModal] = useState<boolean>(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<ImageAttachment | null>(null);
  const [isLightboxFitMode, setIsLightboxFitMode] = useState<boolean>(true);

  // Advanced AI Architectures (Agent, RAG, MCP, Notifications) State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentRoleType | undefined>(undefined);
  const [isRagModalOpen, setIsRagModalOpen] = useState<boolean>(false);
  const [isMcpHubModalOpen, setIsMcpHubModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [selectedMcpToolId, setSelectedMcpToolId] = useState<string | undefined>(undefined);
  const [activeMcpContext, setActiveMcpContext] = useState<Record<string, unknown> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const activeFullscreen = isFullscreenProp !== undefined ? isFullscreenProp : isFullscreen;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen sync & listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!activeFullscreen) {
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (_) {}
      setIsFullscreen(true);
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
      setIsFullscreen(false);
    }
  };

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      toggleFullscreen();
    }
  };

  // Start a new blank entry
  const handleCreateNewEntry = () => {
    const newId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: JournalEntry = {
      id: newId,
      userId: user.uid,
      title: 'Untitled Reflection',
      content: '',
      messages: [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedEntryId(newId);
    setEntryTitle(newEntry.title);
    setEntryContent('');
    setMessages([]);
    setImages([]);
    setSelectedImageId(null);
    setEntryMood(undefined);
    setKeyThemes([]);
    setInsights([]);
    setSummary(undefined);
    setEntryLocation(undefined);
    setSaveStatus('idle');
    setErrorMessage(null);
    setMobileTab('editor');

    // Focus title input
    setTimeout(() => {
      const titleInput = document.getElementById('entry-title-input') as HTMLInputElement | null;
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }, 50);
  };

  // Listen to newEntryTrigger prop
  useEffect(() => {
    if (newEntryTrigger && newEntryTrigger > 0) {
      handleCreateNewEntry();
    }
  }, [newEntryTrigger]);

  // Listen to window event trigger
  useEffect(() => {
    const onTrigger = () => {
      handleCreateNewEntry();
    };
    window.addEventListener('new-reflection-trigger', onTrigger);
    return () => {
      window.removeEventListener('new-reflection-trigger', onTrigger);
    };
  }, [user.uid]);

  // Subscribe to user entries
  useEffect(() => {
    if (!user.uid) return;

    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (fetched) => {
        const sorted = fetched.sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
        setEntries(sorted);

        // If no entry selected, load the first or init new
        setSelectedEntryId((currentId) => {
          if (!currentId && sorted.length > 0) {
            loadEntry(sorted[0]);
            return sorted[0].id;
          }
          if (!currentId && sorted.length === 0) {
            handleCreateNewEntry();
            return null;
          }
          return currentId;
        });
      },
      (error) => {
        console.error('Firestore subscription error:', error);
        setErrorMessage('Failed to connect to Cloud Firestore. Please check your internet connection.');
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Scroll chat on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiResponding]);

  // Keyboard navigation & ESC key for enlarged image lightbox
  useEffect(() => {
    if (!enlargedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedImage(null);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = images.findIndex((img) => img.id === enlargedImage.id);
        if (currentIndex !== -1 && currentIndex < images.length - 1) {
          setEnlargedImage(images[currentIndex + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = images.findIndex((img) => img.id === enlargedImage.id);
        if (currentIndex > 0) {
          setEnlargedImage(images[currentIndex - 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedImage, images]);

  // Load an existing entry into the editor
  const loadEntry = (entry: JournalEntry) => {
    setSelectedEntryId(entry.id);
    setEntryTitle(entry.title || '');
    setEntryContent(entry.content || '');
    setMessages(entry.messages || []);
    const entryImages = entry.images || [];
    setImages(entryImages);
    setSelectedImageId(entryImages.length > 0 ? entryImages[0].id : null);
    setEntryMood(entry.mood);
    setKeyThemes(entry.keyThemes || []);
    setInsights(entry.insights || []);
    setSummary(entry.summary);
    setEntryLocation(entry.location);
    setSaveStatus('saved');
    setErrorMessage(null);
    setMobileTab('editor');
  };

  // Save current entry to Firestore
  const handleSaveEntry = async (customOverrides?: Partial<JournalEntry>): Promise<boolean> => {
    if (!selectedEntryId) return false;

    setSaveStatus('saving');
    setErrorMessage(null);

    const now = new Date().toISOString();
    const currentEntry: JournalEntry = {
      id: selectedEntryId,
      userId: user.uid,
      title: entryTitle.trim() || 'Untitled Reflection',
      content: entryContent,
      messages: customOverrides?.messages !== undefined ? customOverrides.messages : messages,
      images: customOverrides?.images !== undefined ? customOverrides.images : images,
      mood: customOverrides?.mood !== undefined ? customOverrides.mood : entryMood,
      keyThemes: customOverrides?.keyThemes !== undefined ? customOverrides.keyThemes : keyThemes,
      insights: customOverrides?.insights !== undefined ? customOverrides.insights : insights,
      summary: customOverrides?.summary !== undefined ? customOverrides.summary : summary,
      location: customOverrides?.location !== undefined ? customOverrides.location : entryLocation,
      createdAt: entries.find((e) => e.id === selectedEntryId)?.createdAt || now,
      updatedAt: now,
    };

    try {
      await saveJournalEntry(user.uid, currentEntry);
      setSaveStatus('saved');
      return true;
    } catch (err: unknown) {
      console.error('Error saving entry:', err);
      setSaveStatus('error');
      setErrorMessage(`Failed to save entry to Firestore: ${(err as Error)?.message || 'Permission or network issue'}`);
      return false;
    }
  };

  // Select or remove pinned location
  const handleLocationSelected = async (loc: EntryLocation | undefined) => {
    setEntryLocation(loc);
    await handleSaveEntry({ location: loc });
  };

  // Confirm rename of an entry (from list or editor)
  const handleConfirmRenameEntry = async () => {
    if (!entryToRename) return;
    const cleanTitle = renameInputText.trim() || 'Untitled Reflection';
    const entryId = entryToRename.id;

    if (!selectedEntryId || selectedEntryId === entryId || entryId === 'active') {
      setEntryTitle(cleanTitle);
      await handleSaveEntry({ title: cleanTitle });
    } else {
      const target = entries.find((e) => e.id === entryId);
      if (target) {
        const updated = { ...target, title: cleanTitle, updatedAt: new Date().toISOString() };
        setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
        try {
          await saveJournalEntry(user.uid, updated);
        } catch (err) {
          console.error('Failed to rename entry:', err);
        }
      }
    }
    setEntryToRename(null);
    setRenameInputText('');
  };

  // Save customized vault / notebook name
  const handleSaveVaultName = (newName: string) => {
    const cleanName = newName.trim() || 'Personal Sanctuary Vault';
    setVaultName(cleanName);
    try {
      localStorage.setItem(`reflectai_vault_name_${user.uid}`, cleanName);
    } catch (_) {}
    setIsRenamingVault(false);
  };

  // Execute deletion of entry confirmed by user
  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    const entryId = entryToDelete.id;

    try {
      setDeletingId(entryId);
      try {
        await deleteJournalEntry(user.uid, entryId);
      } catch (e) {
        console.warn('Entry may not exist in Firestore yet:', e);
      }

      if (selectedEntryId === entryId) {
        const remaining = entries.filter((ent) => ent.id !== entryId);
        if (remaining.length > 0) {
          loadEntry(remaining[0]);
        } else {
          handleCreateNewEntry();
        }
      }
    } catch (err: unknown) {
      console.error('Failed to delete entry:', err);
      setErrorMessage(`Error deleting entry: ${(err as Error)?.message}`);
    } finally {
      setDeletingId(null);
      setEntryToDelete(null);
    }
  };

  // Permanently clear prompt questions & responses history
  const handleConfirmClearChatHistory = async () => {
    setShowClearHistoryModal(false);
    setMessages([]);
    await handleSaveEntry({ messages: [] });
  };

  // Handle Image Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    setErrorMessage(null);

    try {
      const newAttachments: ImageAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressed = await compressImageFile(file);
        const attachment: ImageAttachment = {
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          url: compressed.url,
          name: compressed.name,
          caption: '',
          notes: '',
          createdAt: new Date().toISOString(),
        };
        newAttachments.push(attachment);
      }

      if (newAttachments.length > 0) {
        const updatedImages = [...images, ...newAttachments];
        setImages(updatedImages);
        setSelectedImageId(newAttachments[0].id);
        setIsImagePanelMinimized(false);
        await handleSaveEntry({ images: updatedImages });
      }
    } catch (err: unknown) {
      console.error('Image processing error:', err);
      setErrorMessage(`Could not process image: ${(err as Error)?.message}`);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update specific image's separate text box / notes
  const handleUpdateImageNotes = (imgId: string, notesText: string) => {
    const updated = images.map((img) =>
      img.id === imgId ? { ...img, notes: notesText } : img
    );
    setImages(updated);
    setSaveStatus('idle');
  };

  // Confirm image deletion
  const handleConfirmDeleteImage = async () => {
    if (!imageToDelete) return;
    const updatedImages = images.filter((img) => img.id !== imageToDelete);
    setImages(updatedImages);
    if (selectedImageId === imageToDelete) {
      setSelectedImageId(updatedImages.length > 0 ? updatedImages[0].id : null);
    }
    setImageToDelete(null);
    await handleSaveEntry({ images: updatedImages });
  };

  // Insert image notes into main reflection text
  const handleInsertImageNotesToJournal = (imgNotes: string, imgName?: string) => {
    if (!imgNotes.trim()) return;
    const addition = `\n\n**Image Notes (${imgName || 'Attached Photo'}):**\n${imgNotes.trim()}\n`;
    setEntryContent((prev) => prev + addition);
    setSaveStatus('idle');
  };

  // Send message to Gemini
  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text && !entryContent && images.length === 0) return;

    const userMessageId = `msg_user_${Date.now()}`;
    const userMessage: InteractionMessage = {
      id: userMessageId,
      role: 'user',
      content: text || 'Can you review my reflection and provide deep insights?',
      timestamp: new Date().toISOString(),
      mode: reflectionMode,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsAiResponding(true);
    setErrorMessage(null);
    setMobileTab('chat');

    await handleSaveEntry({ messages: updatedMessages });

    try {
      // Build additional context from attached image notes and location if any exist
      let enrichedPrompt = userMessage.content;
      const contextParts: string[] = [];
      const imagesWithNotes = images.filter((img) => img.notes && img.notes.trim());
      if (imagesWithNotes.length > 0) {
        const imageContext = imagesWithNotes
          .map((img, idx) => `[Image ${idx + 1} (${img.name || 'Photo'}): ${img.notes}]`)
          .join('\n');
        contextParts.push(`User Attached Image Notes:\n${imageContext}`);
      }
      if (entryLocation) {
        contextParts.push(`Pinned Sanctuary / Reflection Location: ${entryLocation.placeName}${entryLocation.formattedAddress ? ` (${entryLocation.formattedAddress})` : ''} [Coordinates: ${entryLocation.lat.toFixed(4)}, ${entryLocation.lng.toFixed(4)}]`);
      }
      if (contextParts.length > 0) {
        enrichedPrompt = `${userMessage.content}\n\n${contextParts.join('\n\n')}`;
      }

      const response = await askGeminiReflection({
        prompt: enrichedPrompt,
        history: updatedMessages.slice(0, -1),
        mode: reflectionMode,
        entryTitle: entryTitle || undefined,
      });

      const assistantMessage: InteractionMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: response.text,
        timestamp: response.timestamp,
        modelUsed: response.modelUsed,
        mode: reflectionMode,
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await handleSaveEntry({ messages: finalMessages });
    } catch (err: unknown) {
      console.error('Error getting AI reflection:', err);
      setErrorMessage(`Reflection Error: ${(err as Error)?.message || 'Failed to connect to AI server'}`);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Trigger automated summary & mood synthesis
  const handleSummarizeEntry = async () => {
    if (!entryContent.trim() && images.length === 0) {
      setErrorMessage('Please write some reflection content before generating an automated summary.');
      return;
    }

    setIsSummarizing(true);
    setErrorMessage(null);

    try {
      // Include image notes and location in summary context if present
      let contextContent = entryContent;
      const extraContextParts: string[] = [];
      const imagesWithNotes = images.filter((img) => img.notes && img.notes.trim());
      if (imagesWithNotes.length > 0) {
        const imageContext = imagesWithNotes
          .map((img) => `Attached Image (${img.name}): ${img.notes}`)
          .join('\n');
        extraContextParts.push(imageContext);
      }
      if (entryLocation) {
        extraContextParts.push(`Geographic Sanctuary: ${entryLocation.placeName}${entryLocation.formattedAddress ? ` (${entryLocation.formattedAddress})` : ''}`);
      }
      if (extraContextParts.length > 0) {
        contextContent = `${entryContent}\n\n${extraContextParts.join('\n\n')}`;
      }

      const summaryResult = await summarizeJournalEntry({
        title: entryTitle,
        content: contextContent,
      });

      setSummary(summaryResult.summary);
      setEntryMood(summaryResult.mood);
      setKeyThemes(summaryResult.keyThemes);
      setInsights(summaryResult.insights);

      await handleSaveEntry({
        summary: summaryResult.summary,
        mood: summaryResult.mood,
        keyThemes: summaryResult.keyThemes,
        insights: summaryResult.insights,
      });

      // Asynchronously trigger notification dispatch to enabled external destinations
      try {
        const token = await getFreshAuthBearerToken();
        fetch('/api/notifications/dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            entryType: 'ai_summary',
            title: entryTitle || 'Sanctuary Reflection',
            summary: summaryResult.summary,
            mood: summaryResult.mood,
            keyThemes: summaryResult.keyThemes,
            insights: summaryResult.insights,
            contentSnippet: entryContent,
          }),
        }).catch((e) => console.warn('[Notification Dispatch Async]:', e));
      } catch (_) {}
    } catch (err: unknown) {
      console.error('Failed to summarize entry:', err);
      setErrorMessage(`Failed to summarize entry: ${(err as Error)?.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Copy message content
  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Filtered entries for sidebar
  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (entry.title || '').toLowerCase().includes(query) ||
      (entry.content || '').toLowerCase().includes(query) ||
      (entry.keyThemes || []).some((theme) => theme.toLowerCase().includes(query)) ||
      (entry.location?.placeName || '').toLowerCase().includes(query) ||
      (entry.location?.formattedAddress || '').toLowerCase().includes(query);

    const matchesMood =
      selectedMoodFilter === 'all' ||
      (entry.mood || '').toLowerCase().includes(selectedMoodFilter.toLowerCase());

    return matchesSearch && matchesMood;
  });

  const allMoods = Array.from(
    new Set(
      entries
        .map((e) => e.mood)
        .filter((m): m is string => Boolean(m && m.trim()))
    )
  );

  const activeImage = images.find((img) => img.id === selectedImageId) || (images.length > 0 ? images[0] : null);
  const wordCount = entryContent.trim().split(/\s+/).filter(Boolean).length;
  const charCount = entryContent.length;

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] transition-all duration-200 min-h-0 w-full ${
        activeFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : 'h-full max-h-full'
      }`}
    >
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageFileChange}
        className="hidden"
        id="journal-image-file-input"
      />

      {/* FULLSCREEN BRANDING HEADER: ReflectAI Identity, New Entry, RBAC, Security, Profile Menu, & Exit Fullscreen */}
      {activeFullscreen && (
        <header
          id="fullscreen-branding-header"
          className="h-14 sm:h-16 bg-[#0A0A0A] border-b border-white/10 px-3 sm:px-6 flex items-center justify-between shrink-0 z-40"
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-tr from-[#D4AF37] to-[#8E793E] rounded-sm transform rotate-45 shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0"></div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-serif text-base sm:text-xl font-light tracking-[0.15em] sm:tracking-[0.2em] text-white uppercase truncate">
                Reflect<span className="text-[#D4AF37]">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans tracking-[0.15em] uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                <Lock className="w-2.5 h-2.5 text-[#D4AF37]" />
                Full Screen Sanctuary
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Quick New Reflection Button */}
            <button
              id="fullscreen-new-reflection-btn"
              onClick={handleCreateNewEntry}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#EED484] text-[#0A0A0A] text-xs font-sans font-semibold tracking-wider uppercase transition-colors cursor-pointer"
              title="Start a new reflection"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            <span className="hidden xl:inline font-sans text-xs tracking-wider uppercase text-white/40 font-mono">
              {entries.length} {entries.length === 1 ? 'Entry' : 'Entries'}
            </span>

            {/* RBAC Console Quick Access Button */}
            {onOpenRbacConsole && (
              <button
                id="fullscreen-rbac-btn"
                onClick={onOpenRbacConsole}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-mono uppercase font-semibold transition-all cursor-pointer ${roleBadgeStyle[activeRole]}`}
                title="Open Governance & RBAC Console"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{activeRole.toUpperCase()}</span>
              </button>
            )}

            {/* Exit Full Screen Button */}
            <button
              id="exit-fullscreen-topbar-btn"
              onClick={handleToggleFullscreen}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-sans font-medium uppercase tracking-wider transition-colors cursor-pointer"
              title="Exit Full Screen Mode"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </button>

            {/* Security Modal Button */}
            {onOpenSecurityModal && (
              <button
                id="fullscreen-security-info-btn"
                onClick={onOpenSecurityModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-sans tracking-wider uppercase transition-colors cursor-pointer shrink-0"
                title="View Security & Privacy architecture"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden md:inline">Security</span>
              </button>
            )}

            {/* User Profile / Menu with Google Signed-In Indicator and Dropdown */}
            <div
              className="relative border-l border-white/10 pl-2 sm:pl-3"
              onMouseEnter={handleFullscreenMouseEnter}
              onMouseLeave={handleFullscreenMouseLeave}
            >
              <button
                id="fullscreen-user-profile-menu-btn"
                onClick={() => setShowFullscreenUserDropdown(!showFullscreenUserDropdown)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="User menu"
              >
                <div className="text-right hidden md:block">
                  <p className="text-xs font-sans font-medium text-white/90 truncate max-w-[110px]">
                    {user.displayName || user.email || 'User'}
                  </p>
                  <p className="text-[9px] font-sans uppercase tracking-wider font-mono flex items-center justify-end gap-1">
                    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${roleBadgeStyle[activeRole]}`}>
                      ROLE: {activeRole.toUpperCase()}
                    </span>
                  </p>
                </div>

                <div className="relative shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center font-sans text-xs text-white/70 shrink-0">
                      {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {/* Google Signed In Icon Badge */}
                  <div
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#0D0D0D] border border-white/20 flex items-center justify-center p-0.5 shadow-sm"
                    title="Signed in with Google"
                  >
                    <GoogleGIcon className="w-2 h-2" />
                  </div>
                </div>
              </button>

              {showFullscreenUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 rounded-xl bg-[#0D0D0D] border border-white/10 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center p-0.5">
                          <GoogleGIcon className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-sans font-medium text-white/60 tracking-wider uppercase">
                          Google Signed-In
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${roleBadgeStyle[activeRole]}`}>
                        {activeRole.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white/90 truncate">{user.displayName || 'Authenticated User'}</p>
                    <p className="text-[11px] text-white/40 truncate font-mono">{user.email}</p>
                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Signed JWT Valid</span>
                      </span>
                      <span className="text-white/40">UID: {user.uid.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="px-4 py-2 text-xs font-sans text-white/60 flex items-center justify-between border-b border-white/5">
                    <span>Vault Reflections:</span>
                    <span className="font-semibold text-[#D4AF37]">{entries.length}</span>
                  </div>

                  {onOpenRbacConsole && (
                    <div className="p-1.5 border-b border-white/5">
                      <button
                        onClick={() => {
                          setShowFullscreenUserDropdown(false);
                          onOpenRbacConsole();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-sans tracking-wide cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Governance & RBAC Console</span>
                      </button>
                    </div>
                  )}

                  {onOpenSecurityModal && (
                    <div className="p-1.5 border-b border-white/5">
                      <button
                        onClick={() => {
                          setShowFullscreenUserDropdown(false);
                          onOpenSecurityModal();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-sans tracking-wide cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Security & Privacy Architecture</span>
                      </button>
                    </div>
                  )}

                  {onSignOut && (
                    <div className="p-1.5">
                      <button
                        id="fullscreen-sign-out-btn"
                        onClick={() => {
                          setShowFullscreenUserDropdown(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-sans tracking-wide cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Google Vault</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* MOBILE & TABLET NAVIGATION TABS (Visible only below lg breakpoint) */}
      <div className="lg:hidden flex items-center justify-around border-b border-white/10 bg-[#0D0D0D] p-1.5 gap-1 shrink-0 text-xs font-sans">
        <button
          id="mobile-tab-reflections-btn"
          onClick={() => setMobileTab('reflections')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer ${
            mobileTab === 'reflections'
              ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="truncate">Reflections ({filteredEntries.length})</span>
        </button>

        <button
          id="mobile-tab-editor-btn"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer ${
            mobileTab === 'editor'
              ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>

        <button
          id="mobile-tab-chat-btn"
          onClick={() => setMobileTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg font-medium transition-colors text-center cursor-pointer ${
            mobileTab === 'chat'
              ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="truncate">AI Partner ({messages.length})</span>
        </button>

        {/* Mobile Fullscreen Toggle button */}
        <button
          id="mobile-tab-fullscreen-btn"
          onClick={handleToggleFullscreen}
          className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
            activeFullscreen
              ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
              : 'bg-white/5 text-white/60 hover:text-white border-white/10'
          }`}
          title={activeFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          aria-label="Full screen toggle"
        >
          {activeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* WORKSPACE LAYOUT: 3 Independently Slidable Columns */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 w-full">
        {/* LEFT SIDEBAR: History & Entries (Independent Vertical Sliding & Scrolling) */}
        <aside
          id="reflections-sidebar-column"
          className={`w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0D0D0D] flex flex-col flex-shrink-0 h-full overflow-hidden min-h-0 overscroll-contain ${
            mobileTab === 'reflections' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Search & Filter Header */}
          <div className="p-3 sm:p-4 border-b border-white/10 space-y-2.5 sm:space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <BookOpen className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <button
                  id="sidebar-vault-name-btn"
                  type="button"
                  onClick={() => {
                    setVaultNameInput(vaultName);
                    setIsRenamingVault(true);
                  }}
                  className="text-xs font-sans font-medium uppercase tracking-wider text-white/90 hover:text-[#D4AF37] transition-colors truncate flex items-center gap-1.5 cursor-pointer text-left"
                  title="Click to customize your journal name"
                >
                  <span className="truncate">{vaultName}</span>
                  <Pencil className="w-2.5 h-2.5 text-white/40 hover:text-[#D4AF37] shrink-0" />
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-mono">
                  {filteredEntries.length}
                </span>
                <button
                  id="sidebar-new-entry-btn"
                  onClick={handleCreateNewEntry}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-sans font-medium uppercase tracking-wider transition-colors cursor-pointer"
                  title="Start new reflection entry"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* Search Input with Voice-to-Text */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="search-reflections-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reflections..."
                className="w-full pl-9 pr-9 py-1.5 sm:py-2 rounded-lg bg-[#0A0A0A] border border-white/10 text-white text-xs font-sans focus:outline-none focus:border-[#D4AF37]/50 placeholder:text-white/30"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <VoiceInputButton
                  id="voice-search-reflections-btn"
                  onTranscript={(text) => setSearchQuery((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()))}
                  currentValue={searchQuery}
                  size="xs"
                  tooltip="Voice search reflections"
                />
              </div>
            </div>

            {/* Mood Filter */}
            {allMoods.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-sans">
                <button
                  onClick={() => setSelectedMoodFilter('all')}
                  className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                    selectedMoodFilter === 'all'
                      ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/40 font-medium'
                      : 'bg-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  All
                </button>
                {allMoods.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMoodFilter(mood)}
                    className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                      selectedMoodFilter === mood
                        ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/40 font-medium'
                        : 'bg-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Entries List (Independently Scrollable Vertically) */}
          <div
            id="reflections-entries-scroll-area"
            className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5 custom-scrollbar overscroll-contain"
          >
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs space-y-2 font-sans">
                <BookOpen className="w-8 h-8 mx-auto text-white/20 stroke-1" />
                <p>No reflections found matching your search.</p>
                <button
                  onClick={handleCreateNewEntry}
                  className="mt-2 text-[#D4AF37] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Start new reflection
                </button>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isSelected = entry.id === selectedEntryId;
                const dateStr = new Date(entry.updatedAt || entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={entry.id}
                    id={`entry-item-${entry.id}`}
                    onClick={() => loadEntry(entry)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition-all flex flex-col gap-1.5 relative group ${
                      isSelected
                        ? 'bg-white/5 border-l-2 border-[#D4AF37] text-white'
                        : 'hover:bg-white/[0.02] text-white/50 hover:text-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif font-light text-sm sm:text-base text-white truncate flex-1 min-w-0">
                        {entry.title || 'Untitled Reflection'}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono whitespace-nowrap shrink-0">{dateStr}</span>
                    </div>

                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed font-sans break-words [overflow-wrap:anywhere]">
                      {entry.content || (entry.messages.length > 0 ? entry.messages[0].content : 'No reflection notes yet.')}
                    </p>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {entry.mood && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] font-sans tracking-wide truncate">
                            {entry.mood}
                          </span>
                        )}
                        {entry.location && (
                          <span
                            className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-sans tracking-wide flex items-center gap-1 max-w-[120px] truncate shrink-0"
                            title={`${entry.location.placeName}${entry.location.formattedAddress ? ` (${entry.location.formattedAddress})` : ''}`}
                          >
                            <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{entry.location.placeName}</span>
                          </span>
                        )}
                        {entry.images && entry.images.length > 0 && (
                          <span className="text-[10px] text-[#D4AF37]/70 flex items-center gap-0.5 font-sans shrink-0">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {entry.images.length}
                          </span>
                        )}
                        {entry.messages.length > 0 && (
                          <span className="text-[10px] text-white/30 flex items-center gap-0.5 font-sans shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {entry.messages.length}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons: Rename & Delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          id={`rename-entry-btn-${entry.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToRename({ id: entry.id, title: entry.title || 'Untitled Reflection' });
                            setRenameInputText(entry.title || 'Untitled Reflection');
                          }}
                          className="p-1.5 text-white/40 hover:text-[#D4AF37] hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                          title="Rename reflection"
                          aria-label="Rename reflection"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`delete-entry-btn-${entry.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToDelete({ id: entry.id, title: entry.title || 'Untitled Reflection' });
                          }}
                          disabled={deletingId === entry.id}
                          className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors shrink-0 cursor-pointer"
                          title="Delete reflection"
                          aria-label="Delete reflection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CENTER: Active Journal Canvas & Image Facility (Independent Vertical Sliding & Scrolling) */}
        <section
          id="editor-canvas-column"
          className={`flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10 bg-[#0A0A0A] overflow-hidden h-full min-h-0 min-w-0 overscroll-contain ${
            mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Top Bar for Editor */}
          <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-[#0A0A0A]/95 shrink-0 z-10 backdrop-blur-md">
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <input
                    ref={titleInputRef}
                    id="entry-title-input"
                    type="text"
                    value={entryTitle}
                    onChange={(e) => {
                      setEntryTitle(e.target.value);
                      setSaveStatus('idle');
                    }}
                    onBlur={() => handleSaveEntry()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                        handleSaveEntry();
                      }
                    }}
                    placeholder="Enter reflection title..."
                    className="w-full bg-transparent text-lg sm:text-2xl font-serif font-light text-white placeholder:text-white/30 focus:outline-none focus:bg-white/[0.04] px-1 py-0 rounded transition-colors leading-tight"
                  />
                </div>
              </div>

              {/* Pinned Location Tag Badge (Positioned clearly BELOW the title row, with See on Maps strictly BESIDE the location chip, horizontally scrollable) */}
              {entryLocation && (
                <div
                  id="editor-pinned-location-container"
                  className="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/5 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap max-w-full py-0.5"
                >
                  <button
                    id="edit-pinned-location-btn"
                    type="button"
                    onClick={() => setShowLocationPickerModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#EED484] text-xs font-mono transition-colors cursor-pointer shrink-0"
                    title="Click to view or edit coordinates"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="font-semibold">{entryLocation.placeName}</span>
                    {entryLocation.formattedAddress && (
                      <span className="text-white/40 hidden md:inline truncate max-w-[220px]">
                        • {entryLocation.formattedAddress}
                      </span>
                    )}
                  </button>

                  {/* See on Maps Beside It */}
                  <a
                    id="see-on-google-maps-btn"
                    href={getGoogleMapsUrl(entryLocation)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-sans transition-colors shrink-0 cursor-pointer"
                    title="Open location on Google Maps in a new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>See on Google Maps</span>
                  </a>

                  <button
                    id="remove-pinned-location-btn"
                    type="button"
                    onClick={() => handleLocationSelected(undefined)}
                    className="p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors cursor-pointer shrink-0"
                    title="Remove pinned location"
                    aria-label="Remove pinned location"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Horizontally Slidable Action Buttons Holder */}
            <div
              id="editor-actions-holder"
              className="flex items-center gap-1.5 sm:gap-2 font-sans overflow-x-auto no-scrollbar overscroll-x-contain flex-nowrap max-w-full py-0.5 px-1.5 rounded-xl bg-white/[0.03] border border-white/5 shrink-0 select-none transition-all"
            >
              {/* Save Status Badge */}
              <div className="text-xs flex items-center gap-1 font-mono shrink-0 px-1">
                {saveStatus === 'saving' && (
                  <span className="text-[#D4AF37] flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" /> Saved
                  </span>
                )}
                {saveStatus === 'error' && (
                  <button
                    onClick={() => handleSaveEntry()}
                    className="text-red-400 flex items-center gap-1 hover:underline cursor-pointer text-[11px] whitespace-nowrap"
                  >
                    <AlertCircle className="w-3 h-3" /> Retry
                  </button>
                )}
              </div>

              {/* Advanced AI Capabilities: RAG, Agent, MCP, Notifications Quick Action Buttons */}
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 shrink-0">
                <button
                  id="topbar-rag-btn"
                  onClick={() => setIsRagModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Ask questions across all past vault reflections"
                >
                  <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Memory</span>
                </button>

                <button
                  id="topbar-agents-btn"
                  onClick={() => {
                    setSelectedAgentType(undefined);
                    setIsAgentModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Run Autonomous Growth, CBT Bias Audit, or Action Plan Agents"
                >
                  <Bot className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Agents</span>
                </button>

                <button
                  id="topbar-mcp-btn"
                  onClick={() => {
                    setSelectedMcpToolId(undefined);
                    setIsMcpHubModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="Model Context Protocol tools (Calendar, Notion, GitHub, Biometrics)"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>MCP</span>
                </button>

                <button
                  id="topbar-notifications-btn"
                  onClick={() => setIsNotificationsModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title="External notifications (Slack, Discord, Email webhooks)"
                >
                  <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Webhooks</span>
                </button>
              </div>

              {/* Location Pin Button (Google Maps Platform) */}
              <button
                id="pin-location-btn"
                onClick={() => setShowLocationPickerModal(true)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  entryLocation
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#EED484]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-[#D4AF37]'
                }`}
                title="Pin geographic location to reflection using Google Maps Platform"
              >
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{entryLocation ? 'Location' : 'Location'}</span>
              </button>

              {/* Add Image Button */}
              <button
                id="add-image-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#D4AF37] text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="Attach photo or image with dedicated notes & minimize feature"
              >
                {isUploadingImage ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>Image</span>
              </button>

              <button
                id="manual-save-btn"
                onClick={() => handleSaveEntry()}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                title="Save reflection to Firestore"
              >
                <Save className="w-3.5 h-3.5 text-white/40" />
                <span>Save</span>
              </button>

              <button
                id="summarize-btn"
                onClick={handleSummarizeEntry}
                disabled={isSummarizing || (!entryContent.trim() && images.length === 0)}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer shrink-0 whitespace-nowrap"
                title="Use AI to extract themes, mood, and insights"
              >
                {isSummarizing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Summarize</span>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                id="toggle-fullscreen-btn"
                onClick={handleToggleFullscreen}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  activeFullscreen
                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-[#D4AF37]'
                }`}
                title={activeFullscreen ? 'Exit Full Screen' : 'Enter Full Screen (3-Column View)'}
                aria-label={activeFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              >
                {activeFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* AI Intelligence Slider inside the Editor */}
          <EditorAiSlider
            activeEntryTitle={entryTitle}
            hasContent={Boolean(entryContent.trim() || images.length > 0)}
            totalVaultEntries={entries.length}
            activeMcpCount={activeMcpContext ? Object.keys(activeMcpContext).length : 0}
            imageCount={images.length}
            isSummarizing={isSummarizing}
            location={entryLocation}
            onOpenRag={() => setIsRagModalOpen(true)}
            onOpenAgents={(type) => {
              setSelectedAgentType(type);
              setIsAgentModalOpen(true);
            }}
            onOpenMcpHub={(toolId) => {
              setSelectedMcpToolId(toolId);
              setIsMcpHubModalOpen(true);
            }}
            onQuickSummarize={handleSummarizeEntry}
            onTriggerAddImage={() => fileInputRef.current?.click()}
            onOpenLocationPicker={() => setShowLocationPickerModal(true)}
          />

          {/* SCROLLABLE EDITOR BODY: Feedback banner, AI synthesis, images, and reflection canvas (Independently Scrollable Vertically) */}
          <div
            id="editor-content-scroll-area"
            className="flex-1 overflow-y-auto min-h-0 custom-scrollbar flex flex-col overscroll-contain"
          >

          {/* Feedback banner */}
          {errorMessage && (
            <div className="m-3 sm:m-4 p-3 sm:p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs flex items-center justify-between font-sans gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-200 text-xs font-bold shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* AI Insights Bar (if summarized) */}
          {(summary || entryMood || keyThemes.length > 0 || insights.length > 0) && (
            <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-4 sm:p-5 rounded-xl bg-[#0D0D0D] border border-white/10 space-y-3 font-sans overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#D4AF37] truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">AI Entry Synthesis</span>
                </div>
                {entryMood && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-[#D4AF37]/40 text-[#D4AF37] font-medium shrink-0">
                    {entryMood}
                  </span>
                )}
              </div>

              {summary && (
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed italic font-serif break-words [overflow-wrap:anywhere]">
                  {summary}
                </p>
              )}

              {keyThemes.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">Themes:</span>
                  {keyThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70 font-sans"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              )}

              {insights.length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">Takeaways:</span>
                  <ul className="list-disc list-inside text-xs text-white/70 space-y-1 break-words [overflow-wrap:anywhere]">
                    {insights.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* IMAGE FACILITY: MINIMIZE, SIDE-BY-SIDE, & DEDICATED SEPARATE TEXT BOX */}
          {/* ========================================================================= */}
          {images.length > 0 && (
            <div className="mx-3 sm:mx-4 mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-[#0D0D0D] border border-white/10 font-sans space-y-3">
              {/* Header with image tabs, minimize toggle, and side-by-side view toggle */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Attached Visuals ({images.length})</span>
                  </div>

                  {/* Thumbnail selection pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-xs py-0.5">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => {
                          setSelectedImageId(img.id);
                          setIsImagePanelMinimized(false);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                          (selectedImageId === img.id || (!selectedImageId && idx === 0))
                            ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37]'
                            : 'bg-white/5 hover:bg-white/10 text-white/50'
                        }`}
                      >
                        <span>#{idx + 1}</span>
                        <span className="max-w-[70px] truncate">{img.name || 'Image'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controls: Side-by-Side & Minimize Toggle */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                    title="Add another image"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsSideBySideView(!isSideBySideView)}
                    className={`px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                      isSideBySideView
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                    title={isSideBySideView ? 'Switch to Stacked View' : 'Write beside image (Side-by-Side Split)'}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Write Beside</span>
                  </button>

                  <button
                    onClick={() => setIsImagePanelMinimized(!isImagePanelMinimized)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title={isImagePanelMinimized ? 'Expand image view' : 'Minimize image to thumbnail'}
                  >
                    {isImagePanelMinimized ? (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Expand</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-3.5 h-3.5" />
                        <span>Minimize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MINIMIZED VIEW: Ultra-compact dock thumbnail */}
              {isImagePanelMinimized && activeImage && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0A0A0A] border border-white/5">
                  <div
                    onClick={() => setEnlargedImage(activeImage)}
                    className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
                    title="Click to enlarge image"
                  >
                    <div className="relative">
                      <img
                        src={activeImage.url}
                        alt={activeImage.name || 'Minimized reflection'}
                        className="w-10 h-10 rounded-md object-cover border border-white/10 group-hover:border-[#D4AF37]/50 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white/80 group-hover:text-[#D4AF37] font-medium truncate flex items-center gap-1.5">
                        <span>{activeImage.name || 'Attached Photo'}</span>
                        <span className="text-[10px] text-[#D4AF37] opacity-0 group-hover:opacity-100 font-normal">Click to Enlarge</span>
                      </p>
                      <p className="text-[10px] text-white/40 truncate">
                        {activeImage.notes ? `Note: ${activeImage.notes}` : 'Click to enlarge or annotate image'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEnlargedImage(activeImage)}
                      className="p-1.5 text-white/40 hover:text-[#D4AF37] hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                      title="Enlarge Image"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsImagePanelMinimized(false)}
                      className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[#D4AF37] text-xs font-medium cursor-pointer"
                    >
                      Expand
                    </button>
                    <button
                      onClick={() => setImageToDelete(activeImage.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 rounded-md cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* EXPANDED VIEW: Image Preview + Dedicated Notes Box */}
              {!isImagePanelMinimized && activeImage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                  {/* Left: Image Container (Clickable to Enlarge) */}
                  <div
                    onClick={() => setEnlargedImage(activeImage)}
                    className="relative group rounded-xl overflow-hidden border border-white/10 bg-black flex flex-col items-center justify-center min-h-[180px] max-h-[320px] cursor-zoom-in transition-all hover:border-[#D4AF37]/50"
                    title="Click on image to enlarge full screen"
                  >
                    <img
                      src={activeImage.url}
                      alt={activeImage.name || 'Reflection Visual'}
                      className="w-full h-full object-contain max-h-[300px] transition-transform duration-300 group-hover:scale-[1.02]"
                    />

                    {/* Image overlay badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] text-white/70 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3 text-[#D4AF37]" />
                      <span>{activeImage.name || 'Attached Image'}</span>
                    </div>

                    {/* Center Hover Enlarge Cue */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity gap-1 pointer-events-none">
                      <div className="p-2.5 rounded-full bg-black/80 border border-[#D4AF37]/60 text-[#D4AF37] shadow-xl">
                        <ZoomIn className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] text-white font-medium drop-shadow-md">Click to Enlarge</span>
                    </div>

                    {/* Action buttons on image card */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedImage(activeImage);
                        }}
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] cursor-pointer"
                        title="Enlarge image"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageToDelete(activeImage.id);
                        }}
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-red-950/80 border border-red-800/50 text-red-300 cursor-pointer"
                        title="Remove this image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right: Dedicated Separate Text Box for this Image */}
                  <div className="flex flex-col h-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-white/70 font-medium flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Notes On This Image</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <VoiceInputButton
                          id={`voice-image-notes-${activeImage.id}`}
                          onTranscript={(text) => {
                            const updated = (activeImage.notes || '') + text;
                            handleUpdateImageNotes(activeImage.id, updated);
                          }}
                          currentValue={activeImage.notes || ''}
                          size="xs"
                          tooltip="Dictate notes for this image"
                        />
                        <span className="text-[10px] text-white/40">Saved with image</span>
                      </div>
                    </div>

                    <textarea
                      value={activeImage.notes || ''}
                      onChange={(e) => handleUpdateImageNotes(activeImage.id, e.target.value)}
                      onBlur={() => handleSaveEntry()}
                      placeholder="Write your specific observations, diagrams thoughts, or annotations about this image separately here..."
                      className="w-full flex-1 min-h-[120px] p-2.5 rounded-lg bg-[#0A0A0A] border border-white/10 text-xs text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50 resize-none font-sans leading-relaxed"
                    />

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => handleInsertImageNotesToJournal(activeImage.notes || '', activeImage.name)}
                        disabled={!activeImage.notes?.trim()}
                        className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] hover:underline disabled:opacity-30 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Insert Notes into Journal</span>
                      </button>

                      <button
                        onClick={() => handleSaveEntry()}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 text-[10px] uppercase tracking-wider font-medium cursor-pointer"
                      >
                        Save Notes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN REFLECTION CANVAS (Supports standard and side-by-side mode) */}
          <div
            className={`flex-1 p-3 sm:p-5 flex flex-col min-h-[250px] ${
              isSideBySideView && images.length > 0 ? 'bg-[#080808]' : ''
            }`}
          >
            {isSideBySideView && images.length > 0 && (
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-xs text-white/50 font-sans">
                <span className="text-[#D4AF37] font-medium flex items-center gap-1">
                  <Columns className="w-3.5 h-3.5" /> Side-by-Side Journal Canvas
                </span>
                <span className="text-[10px]">Writing directly beside image visuals</span>
              </div>
            )}

            <textarea
              id="entry-content-textarea"
              value={entryContent}
              onChange={(e) => {
                setEntryContent(e.target.value);
                setSaveStatus('idle');
              }}
              onBlur={() => handleSaveEntry()}
              placeholder="Write your thoughts, reflections, experiences, or challenges here... AI uses this context along with any attached visuals during your reflection conversation."
              className="w-full flex-1 min-h-[240px] bg-transparent resize-none focus:outline-none text-white/90 text-sm leading-relaxed placeholder:text-white/20 font-sans break-words"
            />

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40 font-sans gap-2">
              <div className="flex items-center gap-3">
                <VoiceInputButton
                  id="voice-input-reflection-btn"
                  onTranscript={(text) => {
                    setEntryContent((prev) => (prev ? `${prev} ${text}` : text.trim()));
                    setSaveStatus('idle');
                  }}
                  currentValue={entryContent}
                  size="sm"
                  showLabel
                  label="Voice Dictate"
                  tooltip="Dictate your thoughts into the reflection canvas"
                />
                <span className="shrink-0">
                  {wordCount} words • {charCount} chars {images.length > 0 ? `• ${images.length} photo${images.length > 1 ? 's' : ''}` : ''}
                </span>
              </div>
              <span className="hidden md:inline tracking-wide truncate">
                Saved & synced to private vault
              </span>
            </div>
          </div>
          </div>
        </section>

        {/* RIGHT: Multi-Turn AI Reflection Chat (Independent Vertical Sliding & Scrolling) */}
        <section
          id="ai-partner-chat-column"
          className={`w-full lg:w-96 xl:w-[420px] 2xl:w-[480px] flex flex-col bg-[#0D0D0D] overflow-hidden h-full shrink-0 min-h-0 overscroll-contain ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Reflection Chat Header, Refresh Button & Mode Selector */}
          <div className="p-3 sm:p-4 border-b border-white/10 bg-[#0A0A0A] space-y-2.5 sm:space-y-3 font-sans shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/80 truncate">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="truncate">AI Reflection Partner</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Refresh / Clear Chat History Button */}
                <button
                  id="refresh-chat-history-btn"
                  onClick={() => setShowClearHistoryModal(true)}
                  disabled={messages.length === 0 || isAiResponding}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-[#D4AF37] border border-white/10 text-[11px] font-sans tracking-wide transition-colors disabled:opacity-30 cursor-pointer"
                  title="Permanently refresh/clear questions & answers history"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh History</span>
                </button>

                <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                  Smart Model
                </span>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-[#0D0D0D] border border-white/10 text-[11px]">
              <button
                id="mode-reflect-btn"
                onClick={() => setReflectionMode('reflect')}
                className={`py-1.5 px-1 rounded-lg text-center font-medium transition-all truncate cursor-pointer ${
                  reflectionMode === 'reflect'
                    ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                💭 Reflect
              </button>
              <button
                id="mode-brainstorm-btn"
                onClick={() => setReflectionMode('brainstorm')}
                className={`py-1.5 px-1 rounded-lg text-center font-medium transition-all truncate cursor-pointer ${
                  reflectionMode === 'brainstorm'
                    ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                💡 Ideas
              </button>
              <button
                id="mode-action-btn"
                onClick={() => setReflectionMode('action_items')}
                className={`py-1.5 px-1 rounded-lg text-center font-medium transition-all truncate cursor-pointer ${
                  reflectionMode === 'action_items'
                    ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                🎯 Actions
              </button>
              <button
                id="mode-summarize-btn"
                onClick={() => setReflectionMode('summarize')}
                className={`py-1.5 px-1 rounded-lg text-center font-medium transition-all truncate cursor-pointer ${
                  reflectionMode === 'summarize'
                    ? 'bg-white/10 text-[#D4AF37] border border-[#D4AF37]/30 shadow-sm'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                📝 Summary
              </button>
            </div>
          </div>

          {/* Messages Stream (Independently Scrollable Vertically) */}
          <div
            id="ai-partner-messages-scroll-area"
            className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 space-y-4 custom-scrollbar overscroll-contain"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 text-white/40 space-y-4 font-sans">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D4AF37]">
                  <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-serif font-light text-white mb-1">Deepen Your Reflection</h4>
                  <p className="text-xs text-white/40 max-w-xs leading-relaxed">
                    Write in your journal on the left or select a prompt starter below to converse with AI.
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-2 pt-2 text-left">
                  {GUIDED_STARTERS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendPrompt(starter)}
                      className="w-full p-2.5 sm:p-3 rounded-xl bg-[#0A0A0A] border border-white/10 hover:border-[#D4AF37]/40 text-white/70 text-xs transition-colors flex items-center justify-between group text-left cursor-pointer"
                    >
                      <span className="line-clamp-1 pr-2">{starter}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-[#D4AF37] transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 max-w-full`}
                  >
                    <div className="flex items-center gap-2 px-1 text-[10px]">
                      <span className="text-white/40 font-mono">
                        {isUser ? 'You' : 'AI Partner'}
                      </span>
                      <span className="text-white/30 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[95%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-sm relative group break-words [overflow-wrap:anywhere] overflow-hidden ${
                        isUser
                          ? 'bg-[#D4AF37] text-black font-medium rounded-tr-none shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                          : 'bg-[#141414] border border-white/10 text-[#E5E5E5] rounded-tl-none'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap font-sans break-words [overflow-wrap:anywhere]">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-white prose-ul:my-2 prose-li:my-0.5 break-words [overflow-wrap:anywhere]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {!isUser && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white transition-opacity cursor-pointer"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isAiResponding && (
              <div className="flex flex-col items-start space-y-1">
                <span className="text-[10px] text-white/40 font-mono">AI is reflecting...</span>
                <div className="p-3 sm:p-4 rounded-2xl rounded-tl-none bg-[#141414] border border-white/10 flex items-center gap-2.5 text-white/60 text-xs font-sans">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" />
                  </div>
                  <span>Synthesizing reflection...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-[#0A0A0A] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  id="gemini-prompt-input"
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={`Ask AI...`}
                  disabled={isAiResponding}
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl pl-3 sm:pl-4 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 transition-colors font-sans"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <VoiceInputButton
                    id="voice-input-chat-btn"
                    onTranscript={(text) => setInputPrompt((prev) => (prev ? `${prev} ${text}`.trim() : text.trim()))}
                    currentValue={inputPrompt}
                    size="xs"
                    tooltip="Dictate your prompt"
                  />
                </div>
              </div>
              <button
                id="send-prompt-btn"
                type="submit"
                disabled={isAiResponding || (!inputPrompt.trim() && !entryContent.trim() && images.length === 0)}
                className="p-2.5 sm:p-3 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-medium transition-colors disabled:opacity-30 cursor-pointer shadow-sm shrink-0"
                title="Send to AI"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-white/30 mt-1.5 text-center font-sans tracking-wide hidden sm:block">
              Reflections & conversations are protected in your private Firestore vault.
            </p>
          </div>
        </section>
      </div>

      {/* DEDICATED IN-APP DELETE ENTRY MODAL */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-[#E5E5E5] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-950/50 border border-red-900/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-white">Delete Reflection?</h3>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Are you sure you want to delete <span className="text-white font-medium">"{entryToDelete.title}"</span>? This action is permanent and will remove the entry and its attached images from your vault.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 font-sans">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEntry}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {deletingId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED REFRESH / CLEAR CONVERSATION HISTORY MODAL */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-[#E5E5E5] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#D4AF37]">
              <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
                <RotateCcw className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="font-serif text-lg font-normal text-white">Refresh Prompt History?</h3>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-sans">
              This will permanently wipe all questions and AI responses for this reflection. Your reflection notes and attached photos will remain completely safe.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 font-sans">
              <button
                onClick={() => setShowClearHistoryModal(false)}
                className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearChatHistory}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#EED484] text-black text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh & Wipe</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED REMOVE IMAGE MODAL */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-[#E5E5E5] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-950/50 border border-red-900/50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-normal text-white">Remove Image?</h3>
            </div>

            <p className="text-xs text-white/60 leading-relaxed font-sans">
              Are you sure you want to remove this attached image and its separate notes from this reflection?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 font-sans">
              <button
                onClick={() => setImageToDelete(null)}
                className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteImage}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ENLARGED IMAGE LIGHTBOX MODAL WITH FULLSCREEN ZOOM & IN-LIGHTBOX NOTES   */}
      {/* ========================================================================= */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in select-none"
          onClick={() => setEnlargedImage(null)}
        >
          {/* Lightbox Top Control Bar */}
          <div
            className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#D4AF37]">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif text-sm sm:text-base font-light text-white truncate">
                  {enlargedImage.name || 'Reflection Visual'}
                </h3>
                {images.length > 1 && (
                  <p className="text-[11px] text-white/40 font-mono">
                    Image {images.findIndex((img) => img.id === enlargedImage.id) + 1} of {images.length} • Use ← / → keys
                  </p>
                )}
              </div>
            </div>

            {/* Controls: Fit Mode, Download, Close */}
            <div className="flex items-center gap-2 font-sans shrink-0">
              <button
                onClick={() => setIsLightboxFitMode(!isLightboxFitMode)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title={isLightboxFitMode ? 'View Original Scale' : 'Fit to Screen'}
              >
                {isLightboxFitMode ? (
                  <>
                    <ZoomIn className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Zoom</span>
                  </>
                ) : (
                  <>
                    <ZoomOut className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span className="hidden sm:inline">Fit</span>
                  </>
                )}
              </button>

              <a
                href={enlargedImage.url}
                download={enlargedImage.name || 'reflection_image.jpg'}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </a>

              <button
                onClick={() => setEnlargedImage(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-950/80 hover:border-red-800/60 text-white hover:text-red-300 border border-white/10 transition-colors cursor-pointer ml-1"
                title="Close Enlarged View (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage (Image Canvas & Navigation) */}
          <div className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            {/* Left Navigation Arrow */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = images.findIndex((img) => img.id === enlargedImage.id);
                  if (idx > 0) setEnlargedImage(images[idx - 1]);
                  else setEnlargedImage(images[images.length - 1]);
                }}
                className="absolute left-3 sm:left-6 z-20 p-3 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white hover:text-[#D4AF37] transition-all hover:scale-110 cursor-pointer shadow-2xl"
                title="Previous Image (← Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Enlarged Image Display */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={enlargedImage.url}
                alt={enlargedImage.name || 'Enlarged visual'}
                className={`transition-all duration-300 rounded-lg shadow-2xl ${
                  isLightboxFitMode
                    ? 'max-h-[calc(100vh-14rem)] max-w-[calc(100vw-3rem)] sm:max-w-[calc(100vw-12rem)] object-contain'
                    : 'max-w-none max-h-none scale-125 cursor-move'
                }`}
              />
            </div>

            {/* Right Navigation Arrow */}
            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = images.findIndex((img) => img.id === enlargedImage.id);
                  if (idx < images.length - 1) setEnlargedImage(images[idx + 1]);
                  else setEnlargedImage(images[0]);
                }}
                className="absolute right-3 sm:right-6 z-20 p-3 rounded-full bg-black/70 hover:bg-black/90 border border-white/20 text-white hover:text-[#D4AF37] transition-all hover:scale-110 cursor-pointer shadow-2xl"
                title="Next Image (→ Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Lightbox Bottom Notes Bar / Mini-Editor */}
          <div
            className="p-3 sm:p-4 border-t border-white/10 bg-[#0D0D0D]/95 backdrop-blur-md shrink-0 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#D4AF37] font-medium flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>Dedicated Image Notes</span>
                  </span>
                  <span className="text-[10px] text-white/40">Auto-saved with reflection</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={enlargedImage.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateImageNotes(enlargedImage.id, val);
                      setEnlargedImage((prev) => (prev ? { ...prev, notes: val } : null));
                    }}
                    onBlur={() => handleSaveEntry()}
                    placeholder="Type notes, annotations or insights about this image..."
                    className="w-full bg-[#0A0A0A] border border-white/15 rounded-lg pl-3 pr-10 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <VoiceInputButton
                      id="voice-lightbox-notes-btn"
                      onTranscript={(text) => {
                        const updated = (enlargedImage.notes || '') + text;
                        handleUpdateImageNotes(enlargedImage.id, updated);
                        setEnlargedImage((prev) => (prev ? { ...prev, notes: updated } : null));
                      }}
                      currentValue={enlargedImage.notes || ''}
                      size="xs"
                      tooltip="Dictate image notes"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (enlargedImage.notes?.trim()) {
                      handleInsertImageNotesToJournal(enlargedImage.notes, enlargedImage.name);
                    }
                  }}
                  disabled={!enlargedImage.notes?.trim()}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#D4AF37] text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-30 cursor-pointer"
                  title="Append notes to main journal canvas"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Insert in Journal</span>
                </button>

                <button
                  onClick={() => {
                    setImageToDelete(enlargedImage.id);
                    setEnlargedImage(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Remove this image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous AI Agents Modal */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => {
          setIsAgentModalOpen(false);
          setSelectedAgentType(undefined);
        }}
        activeEntry={
          selectedEntryId
            ? {
                id: selectedEntryId,
                userId: user.uid,
                title: entryTitle,
                content: entryContent,
                messages,
                images,
                mood: entryMood,
                keyThemes,
                insights,
                summary,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        allEntries={entries}
        mcpContext={activeMcpContext}
        initialAgentType={selectedAgentType}
        onInsertIntoReflection={(textToInsert) => {
          setEntryContent((prev) => (prev ? `${prev}\n${textToInsert}` : textToInsert));
          handleSaveEntry();
          setIsAgentModalOpen(false);
        }}
      />

      {/* RAG Cross-Temporal Vault Memory Search Modal */}
      <RagSearchModal
        isOpen={isRagModalOpen}
        onClose={() => setIsRagModalOpen(false)}
        entries={entries}
        onSelectEntry={(entryId) => {
          const target = entries.find((e) => e.id === entryId);
          if (target) {
            loadEntry(target);
          }
        }}
        onInsertIntoReflection={(textToInsert) => {
          setEntryContent((prev) => (prev ? `${prev}\n${textToInsert}` : textToInsert));
          handleSaveEntry();
          setIsRagModalOpen(false);
        }}
      />

      {/* Model Context Protocol (MCP) Hub Modal */}
      <McpHubModal
        isOpen={isMcpHubModalOpen}
        onClose={() => {
          setIsMcpHubModalOpen(false);
          setSelectedMcpToolId(undefined);
        }}
        activeEntryTitle={entryTitle}
        activeEntryContent={entryContent}
        initialToolId={selectedMcpToolId}
        onInjectContext={(toolName, contextData) => {
          setActiveMcpContext((prev) => ({
            ...(prev || {}),
            [toolName]: contextData,
          }));
          const summaryFormatted = `\n\n> 🔌 **Connected MCP Telemetry (${toolName})**:\n\`\`\`json\n${JSON.stringify(contextData, null, 2)}\n\`\`\`\n`;
          setEntryContent((prev) => (prev ? `${prev}${summaryFormatted}` : summaryFormatted));
          handleSaveEntry();
          setIsMcpHubModalOpen(false);
        }}
      />

      {/* Google Maps Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationPickerModal}
        onClose={() => setShowLocationPickerModal(false)}
        currentLocation={entryLocation}
        onSelectLocation={handleLocationSelected}
      />

      {/* External Notifications Directive (Slack / Discord / Email) Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        activeEntry={
          selectedEntryId
            ? {
                id: selectedEntryId,
                userId: user.uid,
                title: entryTitle,
                content: entryContent,
                messages,
                images,
                mood: entryMood,
                keyThemes,
                insights,
                summary,
                location: entryLocation,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
      />

      {/* Rename Reflection Title Modal */}
      {entryToRename && (
        <div
          id="rename-entry-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => {
            setEntryToRename(null);
            setRenameInputText('');
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0D0D0D] border border-white/15 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base text-white font-medium">Rename Reflection</h3>
                  <p className="text-[11px] text-white/40 font-sans">Update the title of your journal entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEntryToRename(null);
                  setRenameInputText('');
                }}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="rename-reflection-input" className="text-xs text-white/60 font-sans block">
                Reflection Title
              </label>
              <input
                id="rename-reflection-input"
                type="text"
                autoFocus
                value={renameInputText}
                onChange={(e) => setRenameInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmRenameEntry();
                  } else if (e.key === 'Escape') {
                    setEntryToRename(null);
                    setRenameInputText('');
                  }
                }}
                placeholder="Enter reflection title..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white font-serif text-sm focus:outline-none focus:border-[#D4AF37]/60 placeholder:text-white/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEntryToRename(null);
                  setRenameInputText('');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-sans transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-rename-entry-btn"
                type="button"
                onClick={handleConfirmRenameEntry}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-sans font-medium text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Save Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Journal / Vault Name Modal */}
      {isRenamingVault && (
        <div
          id="rename-vault-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsRenamingVault(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0D0D0D] border border-white/15 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base text-white font-medium">Customize Journal Name</h3>
                  <p className="text-[11px] text-white/40 font-sans">Give your private reflection sanctuary a custom name</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenamingVault(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="rename-vault-input" className="text-xs text-white/60 font-sans block">
                Journal / Notebook Name
              </label>
              <input
                id="rename-vault-input"
                type="text"
                autoFocus
                value={vaultNameInput}
                onChange={(e) => setVaultNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveVaultName(vaultNameInput);
                  } else if (e.key === 'Escape') {
                    setIsRenamingVault(false);
                  }
                }}
                placeholder="e.g. My Personal Sanctuary, Mindful Journal..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-white/15 text-white font-sans text-sm focus:outline-none focus:border-[#D4AF37]/60 placeholder:text-white/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRenamingVault(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-sans transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-rename-vault-btn"
                type="button"
                onClick={() => handleSaveVaultName(vaultNameInput)}
                className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#EED484] text-black font-sans font-medium text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
