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
  }

  bind(func: ((state: ButtonState) => void)) {
    this.element.onclick = () => {
      func(this.state);
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