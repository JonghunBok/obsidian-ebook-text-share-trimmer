var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EbookTextShareTrimmerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view = require("@codemirror/view");

// src/trimmer.ts
var ATTRIBUTION_PATTERNS = [
  /^https?:\/\//i,
  // Any URL
  /\[.*ebook.*\]/i,
  // [크레마 예스24 eBook] etc.
  /에서 자세히 보기/,
  // 교보eBook에서 자세히 보기
  /교보ebook/i,
  // 교보eBook
  /크레마/,
  // 크레마 (예스24)
  /리디북스/,
  // Ridibooks
  /밀리의\s*서재/,
  // 밀리의서재
  /북큐브/,
  // 북큐브
  /yes24\.com/i,
  // yes24 domain in URL
  /kyobobook\.co\.kr/i,
  // kyobo domain in URL
  /ridibooks\.com/i
  // ridi domain in URL
];
var BOOK_CITATION_PATTERNS = [
  /중에서$/,
  // "책 제목 중에서"
  / \| /
  // "제목 | 저자" (크레마 예스24 format)
];
function trimEbookAttribution(text) {
  const lines = text.split("\n");
  let attributionStart = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (ATTRIBUTION_PATTERNS.some((p) => p.test(line))) {
      attributionStart = i;
    } else if (line === "") {
      continue;
    } else if (attributionStart !== -1 && BOOK_CITATION_PATTERNS.some((p) => p.test(line))) {
      attributionStart = i;
    } else {
      break;
    }
  }
  if (attributionStart === -1) return text;
  let end = attributionStart;
  while (end > 0 && lines[end - 1].trim() === "") {
    end--;
  }
  return lines.slice(0, end).join("\n");
}
function applyPasteFormat(text, format, customTemplate) {
  switch (format) {
    case "blockquote":
      return text.split("\n").map((line) => line.trim() === "" ? ">" : `> ${line}`).join("\n");
    case "custom":
      return customTemplate.replace("{{content}}", text);
    default:
      return text;
  }
}

// main.ts
var DEFAULT_SETTINGS = {
  autoPasteMode: true,
  pasteFormat: "blockquote",
  customTemplate: "{{content}}"
};
function processText(text, settings) {
  const trimmed = trimEbookAttribution(text);
  if (trimmed === text || !trimmed.trim()) return null;
  return applyPasteFormat(trimmed, settings.pasteFormat, settings.customTemplate);
}
function buildTrimExtension(plugin) {
  return import_view.EditorView.updateListener.of((update) => {
    if (!plugin.settings.autoPasteMode) return;
    if (!update.docChanged) return;
    for (const tr of update.transactions) {
      if (tr.isUserEvent("ebook-trim")) continue;
      let maxLen = 0;
      let insertedText = "";
      let insertFrom = 0;
      let insertTo = 0;
      tr.changes.iterChanges((_fromA, _toA, fromB, toB, inserted) => {
        const text = inserted.toString();
        if (text.length > maxLen) {
          maxLen = text.length;
          insertedText = text;
          insertFrom = fromB;
          insertTo = toB;
        }
      });
      if (maxLen < 30) continue;
      const result = processText(insertedText, plugin.settings);
      if (!result) continue;
      update.view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: result },
        userEvent: "ebook-trim"
      });
      new import_obsidian.Notice("eBook \uCD9C\uCC98 \uBB38\uAD6C\uAC00 \uC790\uB3D9\uC73C\uB85C \uC81C\uAC70\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      break;
    }
  });
}
var EbookTextShareTrimmerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "trim-ebook-attribution-selection",
      name: "Trim eBook attribution from selection",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new import_obsidian.Notice("\uC120\uD0DD\uB41C \uD14D\uC2A4\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
          return;
        }
        const result = processText(selection, this.settings);
        if (!result) {
          new import_obsidian.Notice("eBook \uCD9C\uCC98 \uBB38\uAD6C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        } else {
          editor.replaceSelection(result);
        }
      }
    });
    this.addCommand({
      id: "trim-ebook-attribution-note",
      name: "Trim eBook attribution from entire note",
      editorCallback: (editor) => {
        const content = editor.getValue();
        const trimmed = trimEbookAttribution(content);
        if (trimmed === content) {
          new import_obsidian.Notice("eBook \uCD9C\uCC98 \uBB38\uAD6C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        } else {
          editor.setValue(trimmed);
          const lastLine = editor.lastLine();
          editor.setCursor({ line: lastLine, ch: editor.getLine(lastLine).length });
        }
      }
    });
    this.registerEditorExtension(buildTrimExtension(this));
    this.addSettingTab(new EbookTrimmerSettingTab(this.app, this));
  }
  onunload() {
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var EbookTrimmerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "eBook Text Share Trimmer" });
    new import_obsidian.Setting(containerEl).setName("\uBD99\uC5EC\uB123\uAE30 \uC2DC \uC790\uB3D9 \uC81C\uAC70").setDesc("eBook \uC571\uC5D0\uC11C \uBCF5\uC0AC\uD55C \uD14D\uC2A4\uD2B8\uB97C \uBD99\uC5EC\uB123\uC744 \uB54C \uCD9C\uCC98 \uBB38\uAD6C\uB97C \uC790\uB3D9\uC73C\uB85C \uC81C\uAC70\uD569\uB2C8\uB2E4.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoPasteMode).onChange(async (value) => {
        this.plugin.settings.autoPasteMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\uBD99\uC5EC\uB123\uAE30 \uD615\uC2DD").setDesc("\uCD9C\uCC98 \uC81C\uAC70 \uD6C4 \uD14D\uC2A4\uD2B8\uC5D0 \uC801\uC6A9\uD560 \uC11C\uC2DD\uC785\uB2C8\uB2E4.").addDropdown(
      (dropdown) => dropdown.addOption("none", "\uC5C6\uC74C").addOption("blockquote", "\uC778\uC6A9\uAD6C (> )").addOption("custom", "\uC9C1\uC811 \uC124\uC815").setValue(this.plugin.settings.pasteFormat).onChange(async (value) => {
        this.plugin.settings.pasteFormat = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.pasteFormat === "custom") {
      new import_obsidian.Setting(containerEl).setName("\uCEE4\uC2A4\uD140 \uD15C\uD50C\uB9BF").setDesc("{{content}} \uC704\uCE58\uC5D0 \uD2B8\uB9AC\uBC0D\uB41C \uD14D\uC2A4\uD2B8\uAC00 \uC0BD\uC785\uB429\uB2C8\uB2E4. \uC608: > {{content}}").addTextArea(
        (text) => text.setPlaceholder("{{content}}").setValue(this.plugin.settings.customTemplate).onChange(async (value) => {
          this.plugin.settings.customTemplate = value;
          await this.plugin.saveSettings();
        })
      );
    }
  }
};
