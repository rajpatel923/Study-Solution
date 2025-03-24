"use client";

import React from "react";
import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Highlighter,
  CheckSquare,
  TextQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EditorMenuBarProps = {
  editor: Editor | null;
};

const EditorMenuBar = ({ editor }: EditorMenuBarProps) => {
  if (!editor) {
    return null;
  }

  const menuItems = [
    {
      icon: <Bold size={18} />,
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
    },
    {
      icon: <Italic size={18} />,
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
    },
    {
      type: "divider",
    },
    {
      icon: <Heading1 size={18} />,
      title: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: () => editor.isActive("heading", { level: 1 }),
    },
    {
      icon: <Heading2 size={18} />,
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive("heading", { level: 2 }),
    },
    {
      icon: <Heading3 size={18} />,
      title: "Heading 3",
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive("heading", { level: 3 }),
    },
    {
      type: "divider",
    },
    {
      icon: <List size={18} />,
      title: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
    },
    {
      icon: <ListOrdered size={18} />,
      title: "Ordered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
    },
    {
      icon: <CheckSquare size={18} />,
      title: "Task List",
      action: () => editor.chain().focus().toggleTaskList().run(),
      isActive: () => editor.isActive("taskList"),
    },
    {
      type: "divider",
    },
    {
      icon: <TextQuote size={18} />,
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
    },
    {
      icon: <Code size={18} />,
      title: "Code Block",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive("codeBlock"),
    },
    {
      icon: <Highlighter size={18} />,
      title: "Highlight",
      action: () => editor.chain().focus().toggleHighlight().run(),
      isActive: () => editor.isActive("highlight"),
    },
    {
      type: "divider",
    },
    {
      icon: <Undo size={18} />,
      title: "Undo",
      action: () => editor.chain().focus().undo().run(),
      isDisabled: () => !editor.can().undo(),
    },
    {
      icon: <Redo size={18} />,
      title: "Redo",
      action: () => editor.chain().focus().redo().run(),
      isDisabled: () => !editor.can().redo(),
    },
  ];

  return (
    <div className="border-b p-2 flex flex-wrap items-center gap-1">
      {menuItems.map((item, index) => {
        if (item.type === "divider") {
          return (
            <div key={`divider-${index}`} className="mx-1 w-px h-6 bg-gray-200" />
          );
        }

        const isActive = item.isActive && item.isActive();
        const isDisabled = item.isDisabled && item.isDisabled();

        return (
          <button
            key={item.title}
            onClick={item.action}
            disabled={isDisabled}
            className={cn(
              "p-2 rounded-md hover:bg-gray-100 transition-colors",
              isActive ? "bg-gray-100 text-primary" : "text-gray-700",
              isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
            )}
            title={item.title}
            type="button"
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
};

export default EditorMenuBar;