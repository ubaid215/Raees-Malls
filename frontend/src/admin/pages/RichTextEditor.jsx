// components/RichTextEditor.jsx
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link2,
  ImageIcon,
  Type,
} from "lucide-react";

const RichTextEditor = ({ 
  value = "", 
  onChange, 
  label = "Description",
  error,
  required = false 
}) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border border-gray-200',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline',
        },
      }),
      Placeholder.configure({
        placeholder: "Write your content here...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none p-4 min-h-[200px] border border-gray-300 rounded-b-lg",
      },
    },
  });

  const addLink = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageInput(false);
    }
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
    disabled = false,
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive
          ? "bg-blue-500 text-white shadow-md"
          : "hover:bg-gray-100 text-gray-700 border border-gray-200"
      }`}
    >
      {children}
    </button>
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="border border-gray-300 rounded-lg bg-white">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-2 bg-gray-50">
          <div className="flex flex-wrap gap-1 items-center">
            {/* Text Formatting */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold (Ctrl+B)"
              >
                <Bold size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic (Ctrl+I)"
              >
                <Italic size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive("strike")}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </ToolbarButton>
            </div>

            {/* Headings */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive("heading", { level: 1 })}
                title="Heading 1"
              >
                <Heading1 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
              >
                <Heading2 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
              >
                <Heading3 size={16} />
              </ToolbarButton>
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive("bulletList")}
                title="Bullet List"
              >
                <List size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive("orderedList")}
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </ToolbarButton>
            </div>

            {/* Media */}
            <div className="flex gap-1 border-r border-gray-300 pr-2">
              <ToolbarButton
                onClick={() => setShowLinkInput(!showLinkInput)}
                isActive={editor.isActive("link")}
                title="Add Link"
              >
                <Link2 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => setShowImageInput(!showImageInput)}
                title="Add Image"
              >
                <ImageIcon size={16} />
              </ToolbarButton>
            </div>

            {/* Undo/Redo */}
            <div className="flex gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo (Ctrl+Z)"
                disabled={!editor.can().undo()}
              >
                <Undo size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo (Ctrl+Y)"
                disabled={!editor.can().redo()}
              >
                <Redo size={16} />
              </ToolbarButton>
            </div>
          </div>

          {/* Link Input */}
          {showLinkInput && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-300">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="Enter link URL"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                />
                <button
                  type="button"
                  onClick={addLink}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkInput(false)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Image Input */}
          {showImageInput && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-300">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && addImage()}
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageInput(false)}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bubble Menu */}
        {editor && (
          <BubbleMenu
            editor={editor}
            className="bg-gray-800 text-white rounded-lg shadow-lg border border-gray-600 p-1 flex gap-1"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded ${editor.isActive("bold") ? "bg-blue-600" : "hover:bg-gray-700"}`}
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded ${editor.isActive("italic") ? "bg-blue-600" : "hover:bg-gray-700"}`}
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1 rounded ${editor.isActive("strike") ? "bg-blue-600" : "hover:bg-gray-700"}`}
            >
              <Strikethrough size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-1 rounded ${editor.isActive("link") ? "bg-blue-600" : "hover:bg-gray-700"}`}
            >
              <Link2 size={14} />
            </button>
          </BubbleMenu>
        )}

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
};

export default RichTextEditor;