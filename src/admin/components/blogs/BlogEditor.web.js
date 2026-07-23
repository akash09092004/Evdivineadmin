import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EditorContent, useEditor } from "@tiptap/react";
import * as StarterKitModule from "@tiptap/starter-kit";
import * as UnderlineModule from "@tiptap/extension-underline";
import * as LinkModule from "@tiptap/extension-link";
import * as ImageModule from "@tiptap/extension-image";
import * as PlaceholderModule from "@tiptap/extension-placeholder";
import * as TableModule from "@tiptap/extension-table";
import * as TableRowModule from "@tiptap/extension-table-row";
import * as TableHeaderModule from "@tiptap/extension-table-header";
import * as TableCellModule from "@tiptap/extension-table-cell";
import { BLOG_COLORS, blogShadow } from "./blogTheme";

const StarterKit =
  StarterKitModule.StarterKit || StarterKitModule.default || StarterKitModule;
const Underline =
  UnderlineModule.Underline || UnderlineModule.default || UnderlineModule;
const Link = LinkModule.Link || LinkModule.default || LinkModule;
const Image = ImageModule.Image || ImageModule.default || ImageModule;
const Placeholder =
  PlaceholderModule.Placeholder ||
  PlaceholderModule.default ||
  PlaceholderModule;
const Table = TableModule.Table || TableModule.default || TableModule;
const TableRow =
  TableRowModule.TableRow || TableRowModule.default || TableRowModule;
const TableHeader =
  TableHeaderModule.TableHeader ||
  TableHeaderModule.default ||
  TableHeaderModule;
const TableCell =
  TableCellModule.TableCell || TableCellModule.default || TableCellModule;

function ToolbarButton({ active, icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toolBtn, active && styles.toolBtnActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? BLOG_COLORS.background : BLOG_COLORS.text}
      />
      <Text style={[styles.toolText, active && styles.toolTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BlogEditor({ value, onChange }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 560;
  const missingExtensions =
    !StarterKit?.configure ||
    !Underline ||
    !Link?.configure ||
    !Image?.configure ||
    !Placeholder?.configure ||
    !Table?.configure;

  const editorExtensions = useMemo(() => {
    if (missingExtensions) {
      return [];
    }

    return [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: "Blog content yahan write karo...",
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ];
  }, [missingExtensions]);

  const editor = useEditor({
    extensions: editorExtensions,
    content: value || "<p></p>",
    autofocus: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "blog-editor-content",
        style: [
          "min-height: 240px",
          "color: #FFFFFF",
          "caret-color: #FFFFFF",
          "outline: none",
          "font-size: 13px",
          "line-height: 1.6",
        ].join("; "),
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextValue = value || "<p></p>";
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue, false);
    }
  }, [value, editor]);

  const linkState = useMemo(
    () => editor?.isActive("link"),
    [editor, editor?.state]
  );

  const insertLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim(), target: "_blank" })
      .run();
  };

  const insertImage = () => {
    if (!editor) return;
    const url = window.prompt("Image URL");

    if (!url) {
      return;
    }

    editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const insertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  if (!editor) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.loading}>
          {missingExtensions
            ? "Rich editor unavailable, fallback loading..."
            : "Editor loading..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbarScroll}
        contentContainerStyle={[
          styles.toolbarContent,
          isCompact && styles.toolbarContentCompact,
        ]}
      >
        <View style={styles.toolbar}>
          <ToolbarButton
            icon="text-outline"
            label="H1"
            active={editor.isActive("heading", { level: 1 })}
            onPress={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          />
          <ToolbarButton
            icon="text-outline"
            label="H2"
            active={editor.isActive("heading", { level: 2 })}
            onPress={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <ToolbarButton
            icon="text-outline"
            label="H3"
            active={editor.isActive("heading", { level: 3 })}
            onPress={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          />
          <ToolbarButton
            icon="caret-up-outline"
            label="Bold"
            active={editor.isActive("bold")}
            onPress={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            icon="remove-outline"
            label="Italic"
            active={editor.isActive("italic")}
            onPress={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            icon="text-outline"
            label="Underline"
            active={editor.isActive("underline")}
            onPress={() => editor.chain().focus().toggleUnderline().run()}
          />
          <ToolbarButton
            icon="list-outline"
            label="Bullets"
            active={editor.isActive("bulletList")}
            onPress={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            icon="list"
            label="Numbered"
            active={editor.isActive("orderedList")}
            onPress={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon="chatbubble-outline"
            label="Quote"
            active={editor.isActive("blockquote")}
            onPress={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            icon="link-outline"
            label="Link"
            active={linkState}
            onPress={insertLink}
          />
          <ToolbarButton
            icon="image-outline"
            label="Image"
            active={editor.isActive("image")}
            onPress={insertImage}
          />
          <ToolbarButton
            icon="grid-outline"
            label="Table"
            active={editor.isActive("table")}
            onPress={insertTable}
          />
          <ToolbarButton
            icon="arrow-undo-outline"
            label="Undo"
            onPress={() => editor.chain().focus().undo().run()}
          />
          <ToolbarButton
            icon="arrow-redo-outline"
            label="Redo"
            onPress={() => editor.chain().focus().redo().run()}
          />
        </View>
      </ScrollView>

      <View style={styles.editorCard}>
        <EditorContent editor={editor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  toolbarScroll: {
    flexGrow: 0,
  },
  toolbarContent: {
    paddingBottom: 2,
  },
  toolbarContentCompact: {
    paddingRight: 2,
  },
  toolbar: {
    flexDirection: "row",
    gap: 8,
  },
  toolBtn: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: BLOG_COLORS.panel,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolBtnActive: {
    backgroundColor: BLOG_COLORS.gold,
    borderColor: BLOG_COLORS.gold,
  },
  toolText: {
    color: BLOG_COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },
  toolTextActive: {
    color: BLOG_COLORS.background,
  },
  editorCard: {
    minHeight: 280,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BLOG_COLORS.border,
    backgroundColor: BLOG_COLORS.background,
    padding: 12,
    ...blogShadow,
  },
  loading: {
    color: BLOG_COLORS.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
});
