"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useAppContext } from "@/context/AppContext";
import { marked } from 'marked';
import cx from 'classnames';

// Import icons
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Highlighter,
  TextQuote,
  Maximize2,
  ListChecks,
  Download,
  Copy,
  Type,
  Save
} from "lucide-react";

const MenuButton = ({ 
  icon, 
  active = false, 
  onClick, 
  disabled = false, 
  tooltip = "",
  color = "default"
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cx(
        "menu-button",
        { "is-active": active },
        { "is-disabled": disabled },
        `color-${color}`
      )}
    >
      {icon}
    </button>
  );
};

const EnhancedEditor = () => {
  const { 
    editorContent, 
    setEditorContent, 
    documentMetadata, 
    updateDocumentMetadata,
    saveDocument,
    saveStatus
  } = useAppContext();
  
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [initialContentSet, setInitialContentSet] = useState(false);
  const [originalSummary, setOriginalSummary] = useState("");

  // Use debounce to avoid too many save operations
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Create debounced save function
  const debouncedSave = useCallback(
    debounce((content) => {
      if (content && saveStatus.status !== "saving") {
        saveDocument(content);
      }
    }, 2000),
    [saveDocument, saveStatus]
  );

  // Extract the summary content from the API response
  const extractSummaryContent = (content) => {
    if (!content) return '';
    
    // If it's already a string, return it directly
    if (typeof content === 'string') {
      return content;
    }
    
    // If it's an object, try to find the summary field
    if (typeof content === 'object') {
      // Check for the specific API response structure
      if (content.status === "success" && content.summary) {
        // Store the original summary for downloading later
        setOriginalSummary(content.summary);
        return content.summary;
      }
      
      // Try common field names for summary content
      for (const field of ['summary', 'content', 'text', 'body', 'data']) {
        if (content[field]) {
          return content[field];
        }
      }
      
      // Last resort - stringify the object
      try {
        return JSON.stringify(content, null, 2);
      } catch (e) {
        console.error("Error stringifying content:", e);
        return "Error processing content";
      }
    }
    
    return String(content);
  };

  // Convert markdown to HTML with basic approach
  const convertMarkdownToHTML = (markdown) => {
    if (!markdown) return '';
    
    // First extract the actual summary content
    const markdownStr = extractSummaryContent(markdown);
    
    try {
      // Use simple marked parsing without custom renderers
      const htmlContent = marked(markdownStr);
      
      // Apply our custom classes using regex replacements
      return htmlContent
        .replace(/<h([1-6])>/g, '<h$1 class="ai-summary-heading">')
        .replace(/<ul>/g, '<ul class="ai-summary-bullet-list">')
        .replace(/<ol>/g, '<ol class="ai-summary-ordered-list">')
        .replace(/<blockquote>/g, '<blockquote class="ai-summary-quote">');
    } catch (error) {
      console.error("Error parsing markdown:", error);
      return `<p>${markdownStr}</p>`;
    }
  };

  // Setup TipTap editor with enhanced extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Disable typography extension that's causing input issues
        typography: false,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      // Typography removed to fix space issues
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight: createLowlight(common),
        defaultLanguage: 'javascript',
      }),
      Placeholder.configure({
        placeholder: 'Your AI summary will appear here...',
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      // Don't update the content during initial loading
      if (!initialContentSet) return;
      
      const html = editor.getHTML();
      
      // Update content in context
      setEditorContent(html);
      
      // Trigger auto-save
      debouncedSave(html);
      
      // Enhanced stats tracking
      const text = editor.getText();
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = text.length;
      
      setWordCount(wordCount);
      setCharacterCount(charCount);
      
      if (documentMetadata) {
        updateDocumentMetadata({
          wordCount: wordCount,
          characterCount: charCount,
        });
      }
    },
    autofocus: false, // Disable autofocus to prevent cursor jumping
    editable: true,
  });

  // Update editor content when it changes in context
  useEffect(() => {
    if (editor && editorContent && !initialContentSet) {
      try {
        // Convert to HTML, handling the case where editorContent might be an object
        const html = convertMarkdownToHTML(editorContent);
        
        if (editor.getHTML() !== html) {
          // Disable automatic updates while we set the initial content
          editor.commands.setContent(html);
          // Mark that we've set the initial content
          setInitialContentSet(true);
        }
      } catch (error) {
        console.error("Error updating editor content:", error);
        
        // Fallback - display raw content
        try {
          const rawContent = extractSummaryContent(editorContent);
          editor.commands.setContent(`<p>${rawContent}</p>`);
          setInitialContentSet(true);
        } catch (fallbackError) {
          console.error("Fallback error:", fallbackError);
        }
      }
    }
  }, [editor, editorContent, initialContentSet]);

  // Manual save function
  const handleManualSave = () => {
    if (editor) {
      saveDocument(editor.getHTML());
    }
  };

  // Function to toggle fullscreen mode
  const toggleFullscreen = () => {
    setShowFullscreen(!showFullscreen);
  };

  // Function to copy content to clipboard
  const copyToClipboard = () => {
    if (editor) {
      const text = editor.getText();
      navigator.clipboard.writeText(text);
      // You could add a toast notification here
    }
  };

  // Function to download summary as markdown
  const downloadAsMD = () => {
    if (editor) {
      // Try to get the original markdown content
      let markdownContent;
      
      if (originalSummary) {
        markdownContent = originalSummary;
      } else {
        markdownContent = editor.getText();
      }
      
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ai-summary.md';
      link.click();
    }
  };

  // Reset editor after unmount to prevent stale state
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
      setInitialContentSet(false);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  // Get save status indicator
  const getSaveStatusIndicator = () => {
    switch (saveStatus.status) {
      case "saving":
        return <span className="text-blue-500 text-xs">Saving...</span>;
      case "saved":
        return <span className="text-green-500 text-xs">Saved at {saveStatus.lastSaved?.toLocaleTimeString()}</span>;
      case "error":
        return <span className="text-red-500 text-xs">Save failed</span>;
      default:
        return saveStatus.lastSaved ? 
          <span className="text-gray-400 text-xs">Last saved at {saveStatus.lastSaved.toLocaleTimeString()}</span> : 
          null;
    }
  };

  return (
    <div className={cx(
      "premium-editor-container",
      { "fixed inset-0 z-50 rounded-none": showFullscreen }
    )}>
      {/* Main Menu Bar */}
      <div className="premium-menu-bar ">
        <div className="menu-left">
          <div className="menu-button-group">
            <MenuButton
              icon={<Heading1 size={16} />}
              active={editor.isActive('heading', { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              tooltip="Heading 1"
              color="purple"
            />
            <MenuButton
              icon={<Heading2 size={16} />}
              active={editor.isActive('heading', { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              tooltip="Heading 2"
              color="purple"
            />
            <MenuButton
              icon={<Heading3 size={16} />}
              active={editor.isActive('heading', { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              tooltip="Heading 3"
              color="purple"
            />
          </div>

          <div className="menu-divider" />

          <div className="menu-button-group">
            <MenuButton
              icon={<Bold size={16} />}
              active={editor.isActive('bold')}
              onClick={() => editor.chain().focus().toggleBold().run()}
              tooltip="Bold"
            />
            <MenuButton
              icon={<Italic size={16} />}
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              tooltip="Italic"
            />
            <MenuButton
              icon={<Highlighter size={16} />}
              active={editor.isActive('highlight')}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              tooltip="Highlight"
            />
            <MenuButton
              icon={<Code size={16} />}
              active={editor.isActive('code')}
              onClick={() => editor.chain().focus().toggleCode().run()}
              tooltip="Inline Code"
            />
          </div>

          <div className="menu-divider" />

          <div className="menu-button-group">
            <MenuButton
              icon={<List size={16} />}
              active={editor.isActive('bulletList')}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              tooltip="Bullet List"
            />
            <MenuButton
              icon={<ListOrdered size={16} />}
              active={editor.isActive('orderedList')}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              tooltip="Numbered List"
            />
            <MenuButton
              icon={<ListChecks size={16} />}
              active={editor.isActive('taskList')}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              tooltip="Task List"
            />
          </div>

          <div className="menu-divider" />

          <div className="menu-button-group">
            <MenuButton
              icon={<TextQuote size={16} />}
              active={editor.isActive('blockquote')}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              tooltip="Quote"
            />
            <MenuButton
              icon={<div className="hr-icon">―</div>}
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Horizontal Rule"
            />
          </div>
        </div>

        <div className="menu-right">
          <div className="stats-container">
            <span className="flex items-center mr-3">
              <Type size={14} className="mr-1" />
              {wordCount} words
            </span>
            <span className="hidden sm:flex items-center">
              {characterCount} chars
            </span>
          </div>
          
          <div className="save-status mr-2">
            {getSaveStatusIndicator()}
          </div>
          
          <div className="menu-divider" />
          
          <div className="menu-button-group">
            <MenuButton
              icon={<Save size={16} />}
              onClick={handleManualSave}
              tooltip="Save now"
              color="green"
              disabled={saveStatus.status === "saving"}
            />
            <MenuButton
              icon={<Copy size={16} />}
              onClick={copyToClipboard}
              tooltip="Copy to clipboard"
              color="blue"
            />
            <MenuButton
              icon={<Download size={16} />}
              onClick={downloadAsMD}
              tooltip="Download as Markdown"
              color="blue"
            />
            <MenuButton
              icon={<Maximize2 size={16} />}
              onClick={toggleFullscreen}
              tooltip="Toggle fullscreen"
              active={showFullscreen}
            />
          </div>

          <div className="menu-divider" />
          
          <div className="menu-button-group">
            <MenuButton
              icon={<Undo size={16} />}
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo"
            />
            <MenuButton
              icon={<Redo size={16} />}
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo"
            />
          </div>
        </div>
      </div>
      
      {/* Bubble menu that appears when text is selected */}
      <BubbleMenu 
        editor={editor} 
        className="bubble-menu" 
        tippyOptions={{ duration: 150 }}
      >
        <MenuButton
          icon={<Bold size={14} />}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          tooltip="Bold"
        />
        <MenuButton
          icon={<Italic size={14} />}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          tooltip="Italic"
        />
        <MenuButton
          icon={<Highlighter size={14} />}
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          tooltip="Highlight"
        />
        <MenuButton
          icon={<Code size={14} />}
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          tooltip="Code"
        />
        <MenuButton
          icon={<TextQuote size={14} />}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          tooltip="Quote"
        />
      </BubbleMenu>
      
      <EditorContent 
        editor={editor} 
        className="premium-editor-content" 
      />
    </div>
  );
};

export default EnhancedEditor;