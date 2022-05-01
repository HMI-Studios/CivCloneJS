interface ButtonState {
  text: string;
  action?: [string, unknown[]];
}

class Button {
  element: HTMLElement;
  private state: ButtonState;

  constructor(element: HTMLElement, state: ButtonState) {
    this.element = element;
    this.state = state;
    this.element.innerText = state.text;
  }

  bindActionCallback(func: ((action: [string, unknown[]][]) => void)) {
    this.element.onclick = () => {
      if (this.state.action) {
        func([this.state.action]);
      }
    };
  }

  setText(text: string) {
    this.state.text = text;
    this.element.innerText = text;
  }

  setAction(action: [string, unknown[]]) {
    this.state.action = action;
  }
}
