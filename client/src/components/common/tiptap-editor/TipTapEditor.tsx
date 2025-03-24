// "use client";

// import React, { useEffect } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Highlight from "@tiptap/extension-highlight";
// import Typography from "@tiptap/extension-typography";
// import Placeholder from "@tiptap/extension-placeholder";
// import TaskList from "@tiptap/extension-task-list";
// import TaskItem from "@tiptap/extension-task-item";
// import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
// import { common, createLowlight } from "lowlight";
// import { useAppContext } from "@/context/AppContext";
// import EditorMenuBar from "./EditorMenuBar";
// import {Markdown} from 'tiptap-markdown';

// const TipTapEditor = () => {
//   const { editorContent, setEditorContent, documentMetadata, updateDocumentMetadata } = useAppContext();

//   const editor = useEditor({
//     extensions: [
//       StarterKit.configure({
//         heading: {
//           levels: [1, 2, 3, 4, 5, 6],
//         },
//         bulletList: {
//           keepMarks: true,
//           keepAttributes: false,
//         },
//         orderedList: {
//           keepMarks: true,
//           keepAttributes: false,
//         },
//       }),
//       Highlight,
//       Typography,
//       TaskList,
//       TaskItem.configure({
//         nested: true,
//       }),
//       CodeBlockLowlight.configure({
//         lowlight: createLowlight(common),
//       }),
//       Placeholder.configure({
//         placeholder: 'Start writing your summary here...',
//       }),
//       Markdown.configure({
//         html: false,  // Disable HTML parsing for security
//         tightLists: true,
//         tightListClass: 'tight',
//         bulletListMarker: '-',
//         linkify: true,
//       }),
//     ],
//     content: editorContent || "",
//     onUpdate: ({ editor }) => {
//       const html = editor.getHTML();
//       setEditorContent(html);
      
//       // Count words and update metadata
//       const text = editor.getText();
//       const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
//       if (documentMetadata) {
//         updateDocumentMetadata({
//           wordCount,
//           lastUpdated: new Date().toISOString(),
//         });
//       }
//     },
//     autofocus: true,
//     editable: true,
//   });

//   // Update editor content when it changes in context
//   useEffect(() => {
//     if (editor && editor.getHTML() !== editorContent) {
//       editor.commands.setContent(editorContent);
//     }
//   }, [editor, editorContent]);

//   return (
//     <div className="prose-editor w-full">
//       <div className="bg-white rounded-lg shadow-sm border">
//         <EditorMenuBar editor={editor} />
//         <div className="p-5">
//           <EditorContent 
//             editor={editor} 
//             className="prose prose-lg max-w-none min-h-[500px] focus:outline-none" 
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TipTapEditor;