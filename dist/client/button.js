class Button {
    constructor(element, state) {
        this.element = element;
        this.state = state;
        this.element.innerText = state.text;
    }
    bindActionCallback(func) {
        this.element.onclick = () => {
            if (this.state.action) {
                func([this.state.action]);
            }
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