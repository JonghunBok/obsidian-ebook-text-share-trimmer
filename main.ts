import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { trimEbookAttribution, applyPasteFormat, PasteFormat } from './src/trimmer';

interface EbookTrimmerSettings {
  autoPasteMode: boolean;
  pasteFormat: PasteFormat;
  customTemplate: string;
}

const DEFAULT_SETTINGS: EbookTrimmerSettings = {
  autoPasteMode: true,
  pasteFormat: 'blockquote',
  customTemplate: '{{content}}',
};

function processText(text: string, settings: EbookTrimmerSettings): string | null {
  const trimmed = trimEbookAttribution(text);
  if (trimmed === text || !trimmed.trim()) return null;
  return applyPasteFormat(trimmed, settings.pasteFormat, settings.customTemplate);
}

function buildTrimExtension(plugin: EbookTextShareTrimmerPlugin): Extension {
  return EditorView.updateListener.of((update) => {
    if (!plugin.settings.autoPasteMode) return;
    if (!update.docChanged) return;

    for (const tr of update.transactions) {
      if (tr.isUserEvent('ebook-trim')) continue;

      let maxLen = 0;
      let insertedText = '';
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
        userEvent: 'ebook-trim',
      });

      new Notice('eBook 출처 문구가 자동으로 제거되었습니다.');
      break;
    }
  });
}

export default class EbookTextShareTrimmerPlugin extends Plugin {
  settings: EbookTrimmerSettings;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'trim-ebook-attribution-selection',
      name: 'Trim eBook attribution from selection',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new Notice('선택된 텍스트가 없습니다.');
          return;
        }
        const result = processText(selection, this.settings);
        if (!result) {
          new Notice('eBook 출처 문구를 찾을 수 없습니다.');
        } else {
          editor.replaceSelection(result);
        }
      },
    });

    this.addCommand({
      id: 'trim-ebook-attribution-note',
      name: 'Trim eBook attribution from entire note',
      editorCallback: (editor: Editor) => {
        const content = editor.getValue();
        const trimmed = trimEbookAttribution(content);
        if (trimmed === content) {
          new Notice('eBook 출처 문구를 찾을 수 없습니다.');
        } else {
          editor.setValue(trimmed);
          const lastLine = editor.lastLine();
          editor.setCursor({ line: lastLine, ch: editor.getLine(lastLine).length });
        }
      },
    });

    this.registerEditorExtension(buildTrimExtension(this));

    this.addSettingTab(new EbookTrimmerSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class EbookTrimmerSettingTab extends PluginSettingTab {
  plugin: EbookTextShareTrimmerPlugin;

  constructor(app: App, plugin: EbookTextShareTrimmerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'eBook Text Share Trimmer' });

    new Setting(containerEl)
      .setName('붙여넣기 시 자동 제거')
      .setDesc('eBook 앱에서 복사한 텍스트를 붙여넣을 때 출처 문구를 자동으로 제거합니다.')
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoPasteMode).onChange(async value => {
          this.plugin.settings.autoPasteMode = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('붙여넣기 형식')
      .setDesc('출처 제거 후 텍스트에 적용할 서식입니다.')
      .addDropdown(dropdown =>
        dropdown
          .addOption('none', '없음')
          .addOption('blockquote', '인용구 (> )')
          .addOption('custom', '직접 설정')
          .setValue(this.plugin.settings.pasteFormat)
          .onChange(async value => {
            this.plugin.settings.pasteFormat = value as PasteFormat;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (this.plugin.settings.pasteFormat === 'custom') {
      new Setting(containerEl)
        .setName('커스텀 템플릿')
        .setDesc('{{content}} 위치에 트리밍된 텍스트가 삽입됩니다. 예: > {{content}}')
        .addTextArea(text =>
          text
            .setPlaceholder('{{content}}')
            .setValue(this.plugin.settings.customTemplate)
            .onChange(async value => {
              this.plugin.settings.customTemplate = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
