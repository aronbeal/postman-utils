
/**
 * For storing loggable messages so they can be output all at once.
 */
class BufferedLog {
    msgs: Array<any> = [];

    constructor() {
        this.clear();
    }
    /**
     * Logs a message for later output.
     * 
     * @param  {...any} args
     *   One or more objects to store for later log output.
     * 
     * See also _output_log(), in this object.
     */
    log(...args: Array<any>): void {
        args.map(arg => this.msgs.push(arg));
    }

    /**
     * Clears the log without output.
     */
    clear(): void {
        this.msgs = [];
    }

    /**
     * Returns all internally stored messages.
     * 
     * @returns Array<string>
     */
    all(): Array<string> {
        return this.msgs;
    }
}
export { BufferedLog };
