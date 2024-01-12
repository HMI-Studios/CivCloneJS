// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Button {
    constructor(element, state) {
        this.element = element;
        this.state = state;
        this.element.innerText = state.text;
    }
    hide() {
        this.element.remove();
    }
    bindActionCallback(func) {
        this.element.onclick = () => {
            if (this.state.action) {
                func([this.state.action]);
            }
        };
    }
    bindCallback(func) {
        this.element.onclick = func;
    }
    unbindCallback() {
        this.element.onclick = null;
    }
    setText(text) {
        this.state.text = text;
        this.element.innerText = text;
    }
    setAction(action) {
        this.state.action = action;
    }
}
class TextAlert {
    constructor(options) {
        var _a;
        const { className, message } = options;
        this.element = document.createElement('div');
        this.element.className = 'textInput';
        if (className) {
            this.element.className += ` ${className}`;
        }
        this.messageElement = document.createElement('p');
        this.messageElement.innerText = message;
        this.element.appendChild(this.messageElement);
        this.submitBtn = document.createElement('button');
        this.submitBtn.innerText = (_a = options.submitText) !== null && _a !== void 0 ? _a : translate('buttons.ok');
        this.element.appendChild(this.submitBtn);
    }
    show(root) {
        root.appendChild(this.element);
    }
    showAsync(root) {
        root.appendChild(this.element);
        return new Promise((resolve, reject) => {
            this.submitBtn.onclick = () => {
                resolve();
                this.hide();
            };
        });
    }
    hide() {
        this.element.remove();
    }
    alert(root, message) {
        if (message) {
            this.messageElement.innerText = message;
        }
        return new Promise((resolve) => {
            this.submitBtn.onclick = () => {
                resolve();
                this.hide();
            };
            this.show(root);
        });
    }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TextInput extends TextAlert {
    constructor(options) {
        const { className, query, submitText, abortText, fields } = options;
        super({ className, message: query });
        // remove submitBtn so it can be readded in the correct position + change text to "Submit"
        this.submitBtn.innerText = submitText !== null && submitText !== void 0 ? submitText : translate('buttons.submit');
        this.submitBtn.remove();
        this.inputFields = [];
        for (const [fieldTitle, placeholder, type] of fields) {
            const fieldElement = document.createElement('div');
            fieldElement.className = 'inputField';
            const fieldTitleElement = document.createElement('label');
            fieldTitleElement.innerText = `${fieldTitle}: `;
            fieldElement.appendChild(fieldTitleElement);
            const fieldInputElement = document.createElement('input');
            if (placeholder)
                fieldInputElement.placeholder = placeholder;
            if (type)
                fieldInputElement.type = type;
            fieldElement.appendChild(fieldInputElement);
            this.inputFields.push(fieldInputElement);
            this.element.appendChild(fieldElement);
        }
        this.abortBtn = document.createElement('button');
        this.abortBtn.innerText = abortText !== null && abortText !== void 0 ? abortText : translate('buttons.abort');
        this.element.appendChild(this.abortBtn);
        // re-add submit button
        this.element.appendChild(this.submitBtn);
    }
    prompt(root, optional) {
        // show/hide cancel button (?)
        this.abortBtn.hidden = !optional;
        // clear inputs
        for (const field of this.inputFields) {
            field.value = '';
        }
        return new Promise((resolve, reject) => {
            this.submitBtn.onclick = () => {
                resolve(this.inputFields.map(field => field.value));
                this.hide();
            };
            this.abortBtn.onclick = () => {
                if (optional) {
                    reject();
                    this.hide();
                }
                else {
                    this.prompt(root, optional)
                        .then((result) => {
                        resolve(result);
                        this.hide();
                    });
                }
            };
            this.show(root);
        });
    }
}
//# sourceMappingURL=widgets.js.map