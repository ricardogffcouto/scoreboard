var options = {
    theme:"sk-bounce",
    textColor:"white"
};

export function open_overlay(message) {
    options.message = message
    HoldOn.open(options)
}

export function close_overlay(){
    HoldOn.close()
}