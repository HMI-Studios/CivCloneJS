class Button {
    constructor(element, state) {
        this.element = element;
        this.state = state;
    }
    bind(func) {
        this.element.onclick = () => {
            func(this.state);
        };
    }
    setText(text) {
        this.state.text = text;
        this.element.innerText = text;
    }
    setAction(action) {
        this.state.action = action;
    }
}
class TextInput {
    constructor(options) {
        const { className, query, fields } = options;
        this.element = document.createElement('div');
        this.element.className = 'textInput';
        if (className) {
            this.element.className += ` ${className}`;
        }
        const queryElement = document.createElement('div');
        queryElement.innerText = query;
        this.element.appendChild(queryElement);
        this.inputFields = [];
        for (const [fieldTitle, placeholder] of fields) {
            const fieldElement = document.createElement('div');
            fieldElement.className = 'inputField';
            const fieldTitleElement = document.createElement('label');
            fieldTitleElement.innerText = `${fieldTitle}: `;
            fieldElement.appendChild(fieldTitleElement);
            const fieldInputElement = document.createElement('input');
            fieldInputElement.placeholder = placeholder;
            fieldElement.appendChild(fieldInputElement);
            this.inputFields.push(fieldInputElement);
            this.element.appendChild(fieldElement);
        }
        this.abortBtn = document.createElement('button');
        this.abortBtn.innerText = 'Cancel';
        this.element.appendChild(this.abortBtn);
        this.submitBtn = document.createElement('button');
        this.submitBtn.innerText = 'Submit';
        this.element.appendChild(this.submitBtn);
    }
    show(root) {
        root.appendChild(this.element);
    }
    hide() {
        this.element.remove();
    }
    prompt(root, optional) {
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
                if (optional)
                    reject();
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