import * as monaco from 'monaco-editor';

type DotNetObjectReference = any;
const registeredCompletionHandlers = {};
let editor;

/**
 * 初始化编辑器
 * @param element
 * @param component
 * @param language
 * @param readOnly
 * @param value
 */
export function init(element: HTMLElement, component: DotNetObjectReference, language: string, readOnly: boolean, value: string) {
    if (!registeredCompletionHandlers[language]) {
        registeredCompletionHandlers[language] = true;
        monaco.languages.registerCompletionItemProvider(language, new RemoteCompletionItemProvider());
    }

    editor = monaco.editor.create(element, {
        value: value,
        language: language,
        readOnly: readOnly, //是否只读
        minimap: {enabled: false},
        theme: 'vs-dark'
    });

    editor.getModel()['blazorComponent'] = component;

    editor.onDidBlurEditorText(() => {
        const value = editor.getValue();
        component.invokeMethodAsync('HandleEditorBlur', value);
    });
}

/**
 * 初始化Diff编辑器
 * @param element
 * @param component
 * @param language
 * @param readOnly
 * @param value
 * @param originalValue
 */
export function initDiff(element: HTMLElement, component: DotNetObjectReference, language: string, readOnly: boolean, value: string, originalValue: string) {
    if (!registeredCompletionHandlers[language]) {
        registeredCompletionHandlers[language] = true;
        monaco.languages.registerCompletionItemProvider(language, new RemoteCompletionItemProvider());
    }

    let diffEditor = monaco.editor.createDiffEditor(element, {
        automaticLayout: true, // 自动布局,
        minimap: {enabled: false},
        readOnly: readOnly, //是否只读
        theme: 'vs-dark'
    });

    diffEditor.getModel()['blazorComponent'] = component;

    diffEditor.setModel({
        original: monaco.editor.createModel(originalValue, language),
        modified: monaco.editor.createModel(value, language),
    });

    editor = diffEditor.getModifiedEditor();
    editor.onDidBlurEditorText(() => {
        const value = editor.getValue();
        component.invokeMethodAsync('HandleEditorBlur', value);
    });
}

/**
 * 光标处插入文本
 * @param component
 * @param insertText
 */
export function executeInsert(component: DotNetObjectReference, insertText: string): boolean {
    let selection = editor.getSelection();
    let range = new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn);

    let edits = [{
        range: range,
        text: insertText,
        forceMoveMarkers: true
    }];
    let result = editor.executeEdits("", edits);

    // 更新组件值
    if (result) {
        component.invokeMethodAsync('HandleEditorBlur', editor.getValue());
    }
    return result;
}

class RemoteCompletionItemProvider implements monaco.languages.CompletionItemProvider {
    public triggerCharacters = ['.'];

    async provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext, token: monaco.CancellationToken): Promise<monaco.languages.CompletionList> {
        const component = model['blazorComponent'] as DotNetObjectReference;
        if (component) {
            const value = model.getValue();
            const suggestions = await component.invokeMethodAsync('GetCompletions', value, position);
            if (suggestions) {
                return {
                    suggestions: suggestions.map(s => (<monaco.languages.CompletionItem>{
                        kind: s.kind,
                        label: s.label,
                        insertText: s.insertText,
                        range: null,
                        documentation: s.documentation,
                    }))
                };
            }
        }

        return {suggestions: []};
    }
}
