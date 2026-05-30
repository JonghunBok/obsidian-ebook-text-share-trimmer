import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { trimEbookAttribution } from './src/trimmer';

interface EbookTrimmerSettings {
  autoPasteMode: boolean;
}

const DEFAULT_SETTINGS: EbookTrimmerSettings = {
  autoPasteMode: true,
};

function buildTrimExtension(plugin: EbookTextShareTrimmerPlugin): Extension {
  return EditorView.updateListener.of((update) => {
    if (!plugin.settings.autoPasteMode) return;
    if (!update.docChanged) return;

    for (const tr of update.transactions) {
      if (tr.isUserEvent('ebook-trim')) continue;

      // 가장 큰 단일 삽입을 찾는다 (붙여넣기는 보통 한 번에 큰 텍스트를 삽입)
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

      // 짧은 삽입(타이핑, 자동완성 등)은 건너뜀
      if (maxLen < 30) continue;

      const trimmed = trimEbookAttribution(insertedText);
      if (trimmed === insertedText) continue;
      // 트리밍 결과가 비어있으면 건너뜀 (예: URL만 단독 붙여넣기)
      if (!trimmed.trim()) continue;

      update.view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: trimmed },
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
        const trimmed = trimEbookAttribution(selection);
        if (trimmed === selection) {
          new Notice('eBook 출처 문구를 찾을 수 없습니다.');
        } else {
          editor.replaceSelection(trimmed);
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
      .setDesc(
        'eBook 앱에서 복사한 텍스트를 붙여넣을 때 출처 문구(책 제목, 저자, 링크)를 자동으로 제거합니다. 기본적으로 활성화되어 있습니다.'
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoPasteMode).onChange(async value => {
          this.plugin.settings.autoPasteMode = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
