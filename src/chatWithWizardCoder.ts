import * as vscode from "vscode";
import { hideStatusMessage, showTemporaryStatusMessage } from "./utils";
import { ViewProvider } from "./webviews/viewProvider";
import fetch from 'node-fetch';

type ApiResponse = {
    results: Array<{ text: string }>;
};

export const chatToWizardCoder = (
    webViewProvider: ViewProvider | undefined
) => {
    return async () => {
        if (!webViewProvider) {
            vscode.window.showErrorMessage("Webview is not available.");
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selectedText = editor.document.getText(editor.selection);
        const textForQuery = selectedText
            ? `
  \`\`\`
  ${selectedText}
  \`\`\`
  `
            : "";

        const customQuery = await vscode.window.showInputBox({
            prompt: "Enter your custom query",
        });

        if (!customQuery) {
            return;
        }

        const query = `${customQuery} : ${textForQuery}`;
        showTemporaryStatusMessage("Calling WizardCoder API...", undefined, true);
        await webViewProvider.sendMessageToWebView({
            type: "askQuestion",
            question: query,
        });
        try {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

            const apiEndpoint = vscode.workspace.getConfiguration('wizardCoder').get<string>('apiEndpoint') ?? '';

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'contentType': 'application/json' },
                body: JSON.stringify({
                    prompt: `Below is an instruction that describes a task. Write a response that appropriately completes the request
### Instruction: ${query}
### Response:`,
                    max_new_tokens: 2048,
                    auto_max_new_tokens: 'True',
                    mode: 'instruct',  // Valid options: chat, chat-instruct, instruct
                    character: 'Example',
                    instruction_template: 'Alpaca',  // Will get autodetected if unset
                    your_name: 'Coder',
                    regenerate: 'False',
                    _continue: 'False',
                    stop_at_newline: 'False',
                    chat_generation_attempts: 1,
                    preset: `None`,
                    do_sample: 'True',
                    temperature: 0.7,
                    top_p: 0.1,
                    typical_p: 1,
                    epsilon_cutoff: 0,  // In units of 1e-4
                    eta_cutoff: 0,  // In units of 1e-4
                    tfs: 1,
                    top_a: 0,
                    repetition_penalty: 1.18,
                    repetition_penalty_range: 0,
                    top_k: 40,
                    min_length: 0,
                    no_repeat_ngram_size: 0,
                    num_beams: 1,
                    penalty_alpha: 0,
                    length_penalty: 1,
                    early_stopping: 'False',
                    mirostat_mode: 0,
                    mirostat_tau: 5,
                    mirostat_eta: 0.1,
                    guidance_scale: 1,
                    negative_prompt: '',
                    seed: -1,
                    add_bos_token: 'True',
                    truncation_length: 2048,
                    ban_eos_token: 'False',
                    skip_special_tokens: 'True',
                    stopping_strings: []
                }),
            });
            const json = await response.json() as ApiResponse;
            const predictions = json.results;
            if (predictions[0].text) {
                await webViewProvider.sendMessageToWebView({
                    type: "addResponse",
                    value: predictions[0].text,
                });
            } else {
                showTemporaryStatusMessage("Failed to call chatgpt!", 5000);
                webViewProvider.sendMessageToWebView({
                    type: "addResponse",
                    value: "Failed to call chatgpt!",
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            hideStatusMessage();
        }


    };
};