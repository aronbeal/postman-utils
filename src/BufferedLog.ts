
type LogEntry = {
    msg: any,
    level: string | undefined
}

/**
 * For storing loggable messages so they can be output all at once.
 */
class BufferedLog {
    msgs: Array<LogEntry> = [];
    constructor() {
        this.clear();
    }
    /**
     * Logs a message for later output at the given level.
     * See also log() above.
     * 
     * @param {any} msg
     *   One or more msgs to store for later log output.
     */
    private logLevel(level: string = 'default', ...msgs: Array<any>): void {
        msgs.map(msg =>
            this.msgs.push({ msg: msg, level: level }));
    }

    /**
     * Logs one or more messages for later output.  A message here can be 
     * anything, but scalar values are preferred.
     * 
     * @param  {...any} msgs
     *   One or more msgs to store for later log output.
     */
    log(...msgs: Array<any>): void {
        this.logLevel('default', ...msgs);
        this.flush();
    }
    info(...msgs: Array<any>): void {
        this.logLevel('info', ...msgs);
        this.flush();
    }
    warn(...msgs: Array<any>): void {
        this.logLevel('warn', ...msgs);
        this.flush();
    }
    error(...msgs: Array<any>): void {
        this.logLevel('error', ...msgs);
        this.flush();
    }

    /**
     * Clears the log without output.
     */
    clear(): void {
        this.msgs = [];
    }

    /**
     * Writes all buffered messages, and clears the buffer.
     */
    flush(): void {
        this.msgs.map(tuple => {
            tuple = Object.freeze(tuple);
            if (typeof tuple.level === undefined) {
                console.log(tuple.msg);
                return;
            }
            switch(tuple.level) {
                case 'info': 
                    console.info(tuple.msg);
                    break;
                case 'warn':
                    console.warn(tuple.msg);
                    break;
                case 'error':
                    console.error(tuple.msg);
                    break;
                case 'default':
                default:
                    console.trace(tuple.msg);
                    break;
            }
        });
        this.msgs = [];
    }

    /**
     * Returns all internally stored messages.
     * 
     * @returns Array<string>
     */
    all(): Array<LogEntry> {
        return this.msgs.map((tuple: LogEntry) => tuple.msg);
    }
}
export { BufferedLog };
