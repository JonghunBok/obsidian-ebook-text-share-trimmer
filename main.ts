import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { trimEbookAttribution } from './src/trimmer';

interface EbookTrimmerSettings {
  autoPasteMode: boolean;
}

const DEFAULT_SETTINGS: EbookTrimmerSettings = {
  autoPasteMode: true,
};

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

    this.registerEvent(
      this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor) => {
        if (!this.settings.autoPasteMode) return;
        const text = evt.clipboardData?.getData('text/plain');
        if (!text) return;
        const trimmed = trimEbookAttribution(text);
        if (trimmed !== text) {
          evt.preventDefault();
          editor.replaceSelection(trimmed);
          new Notice('eBook 출처 문구가 자동으로 제거되었습니다.');
        }
      })
    );

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
