interface ButtonState {
  text: string;
  action?: [string, unknown[]];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class Button {
  element: HTMLElement;
  private state: ButtonState;

  constructor(element: HTMLElement, state: ButtonState) { // TODO: make this take a string instead of an HTMLElement
    this.element = element;
    this.state = state;
    this.element.innerText = state.text;
  }

  hide(): void {
    this.element.remove();
  }

  bindActionCallback(func: ((action: [string, unknown[]][]) => void)) {
    this.element.onclick = () => {
      if (this.state.action) {
        func([this.state.action]);
      }
    };
  }

  bindCallback(func: ((event: MouseEvent) => any)): void {
    this.element.onclick = func;
  }

  unbindCallback(): void {
    this.element.onclick = null;
  }

  setText(text: string) {
    this.state.text = text;
    this.element.innerText = text;
  }

  setAction(action: [string, unknown[]]) {
    this.state.action = action;
  }
}

class TextAlert {
  element: HTMLElement;
  protected messageElement: HTMLParagraphElement;
  protected submitBtn: HTMLButtonElement;

  constructor(options: { className?: string, message: string, submitText?: string }) {
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
    this.submitBtn.innerText = options.submitText ?? 'Ok';
    this.element.appendChild(this.submitBtn);

  }

  show(root: HTMLElement): void {
    root.appendChild(this.element);
  }

  showAsync(root: HTMLElement): Promise<void> {
    root.appendChild(this.element);
    return new Promise((resolve: () => void, reject: (reason?: unknown) => void) => {
      this.submitBtn.onclick = () => {
        resolve();
        this.hide();
      }
    });
  }

  hide(): void {
    this.element.remove();
  }

  alert(root: HTMLElement, message?: string): Promise<void> {
    if (message) {
      this.messageElement.innerText = message;
    }
    return new Promise((resolve: () => void, /* reject: (reason?: unknown) => void */) => {
      this.submitBtn.onclick = () => {
        resolve();
        this.hide();
      }
      this.show(root);
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TextInput extends TextAlert {
  element: HTMLElement;
  private abortBtn: HTMLButtonElement;
  private inputFields: HTMLInputElement[];

  constructor(options: { className?: string, query: string, fields: [string, string?, string?][] }) {
    const { className, query, fields } = options;
    super({ className, message: query });

    // remove submitBtn so it can be readded in the correct position + change text to "Submit"
    this.submitBtn.innerText = 'Submit';
    this.submitBtn.remove();

    this.inputFields = [];
    for (const [fieldTitle, placeholder, type] of fields) {
      const fieldElement =  document.createElement('div');
      fieldElement.className = 'inputField';

      const fieldTitleElement = document.createElement('label');
      fieldTitleElement.innerText = `${fieldTitle}: `;
      fieldElement.appendChild(fieldTitleElement);

      const fieldInputElement = document.createElement('input');
      if (placeholder) fieldInputElement.placeholder = placeholder;
      if (type) fieldInputElement.type = type;
      fieldElement.appendChild(fieldInputElement);
      this.inputFields.push(fieldInputElement);

      this.element.appendChild(fieldElement);
    }

    this.abortBtn = document.createElement('button');
    this.abortBtn.innerText = 'Cancel';
    this.element.appendChild(this.abortBtn);

    // re-add submit button
    this.element.appendChild(this.submitBtn);
  }

  prompt(root: HTMLElement, optional: boolean): Promise<string[]> {
    // show/hide cancel button (?)
    this.abortBtn.hidden = !optional;
    // clear inputs
    for (const field of this.inputFields) {
      field.value = '';
    }
    return new Promise((resolve: (value: string[]) => void, reject: (reason?: unknown) => void) => {
      this.submitBtn.onclick = () => {
        resolve( this.inputFields.map(field => field.value) );
        this.hide();
      }
      this.abortBtn.onclick = () => {
        if (optional) reject();
        else {
          this.prompt(root, optional)
            .then((result) => {
              resolve(result);
              this.hide();
            });
        }
      }
      this.show(root);
    });
  }
}