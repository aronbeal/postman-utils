
type LogEntry = {
    msg: any,
    level: string | undefined
}

enum LogLevel {
    default = 'default',
    info = 'info',
    warn = 'warn',
    error = 'error',
    trace = 'trace'
}
enum LogVerbosity {
    none = 0,
    minimal,
    verbose,
    very_verbose,
    default = minimal,
}

/**
 * For storing loggable messages so they can be output all at once.
 */
class Logger {
    msgs: Array<LogEntry> = [];
    verbosityPreference: number;
    constructor(verbosity: number = 1) {
        this.verbosityPreference = verbosity;
    }

    /**
     * Allows outside caller to change logger verbosity.
     */
    setVerbosity(verbosity: number): this {
        console.info(`Logger verbosity set to ${LogVerbosity[verbosity]}`)
        this.verbosityPreference = verbosity;

        return this;
    }
    /**
     * Convenience method to dump an object to console.
     */
    dump(obj: any, level: LogLevel = LogLevel.default, verbosity: LogVerbosity = LogVerbosity.default) {
        this.log([obj], level, verbosity);
    }

    /**
     * Logs one or more messages for later output.  A message here can be 
     * anything, but scalar values are preferred.
     * 
     * @param {string|Array<any>} msgs Any messages to log.  If logging objects,
     *                               you need to use the array format.
     * @param {string} level The logging level.  One of 'default', 'info', 'warn', or 'error'.
     * @param {string} verbosity The verbosity at which this log message shows.
     *                           If the verbosity is not greater than or equal to the
     *                           global verbosity level, the message is suppressed.
     */
    log(msgs: string | Array<any>, level: LogLevel = LogLevel.default, verbosity: LogVerbosity = LogVerbosity.default): void {
        if (this.verbosityPreference < verbosity) {
            return;
        }
        if (typeof msgs === 'string') {
            msgs = [msgs];
        }
        msgs.map(msg => {
            switch (level) {
                case LogLevel.info:
                    console.info(msg);
                    break;
                case LogLevel.warn:
                    console.warn(msg);
                    break;
                case LogLevel.error:
                    console.error(msg);
                    break;
                case LogLevel.trace:
                    console.trace(msg);
                    break;
                case LogLevel.default:
                default:
                    console.log(msg);
                    break;
            }
        });
    }
}
export { LogEntry, LogLevel, LogVerbosity };
export default Logger;
