using System.Diagnostics.CodeAnalysis;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Aigo.Blazor.MonacoEditor;

/// <summary>
/// 代码编辑器基类
/// </summary>
public class CodeEditorBase : ComponentBase, IAsyncDisposable
{
    /// <summary>
    /// 编辑器值
    /// </summary>
    [Parameter]
    public string? Value { get; set; }

    /// <summary>
    /// 编辑器代码语言
    /// </summary>
    [Parameter]
    public string Language { get; set; } = "json";

    /// <summary>
    /// 编辑器默认高度
    /// </summary>
    [Parameter]
    public int Height { get; set; } = 500;
    
    /// <summary>
    /// 编辑器是否只读
    /// </summary>
    [Parameter]
    public bool ReadOnly { get; set; }

    [Parameter]
    public EventCallback<string> ValueChanged { get; set; }

    [Parameter]
    public Func<string, Position, Task<Suggestion[]>>? OnCompletionsRequested { get; set; }
    
    [Inject]
    [NotNull]
    protected IJSRuntime? JS { get; set; }
    
    protected DotNetObjectReference<CodeEditorBase> thisReference;
    protected ElementReference element;
    protected readonly Lazy<Task<IJSObjectReference>> moduleTask;
    
    public CodeEditorBase()
    {
        thisReference = DotNetObjectReference.Create(this);
        moduleTask = new(() => JS.InvokeAsync<IJSObjectReference>(
            "import", "./_content/Aigo.Blazor.MonacoEditor/main.js").AsTask());
    }

    /// <summary>
    /// 执行光标处插入文本
    /// </summary>
    /// <param name="insertText"></param>
    /// <returns></returns>
    public async Task<bool> ExecuteInsertText(string insertText)
    {
        var module = await moduleTask.Value;
        return await module.InvokeAsync<bool>("executeInsert", thisReference, insertText);
    }

    [JSInvokable]
    public Task HandleEditorBlur(string newValue)
    {
        return ValueChanged.InvokeAsync(newValue);
    }

    [JSInvokable]
    public Task<Suggestion[]> GetCompletions(string value, Position position)
        => OnCompletionsRequested?.Invoke(value, position);

    async ValueTask IAsyncDisposable.DisposeAsync()
    {
        thisReference.Dispose();
        if (moduleTask.IsValueCreated)
        {
            var module = await moduleTask.Value;
            await module.DisposeAsync();
        }
    }

}