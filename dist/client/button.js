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
//# sourceMappingURL=button.js.map