import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredSession } from "./types";
// One local process owns this store. Replace with your database adapter for hosted apps.
export class SessionStore<Result> {
  private writes = Promise.resolve();
  constructor(readonly directory: string) {}
  async read(id: string): Promise<StoredSession<Result> | undefined> {
    if (!/^[\w-]+$/.test(id)) throw new Error("Invalid session ID");
    try {
      return JSON.parse(
        await readFile(join(this.directory, `${id}.json`), "utf8"),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
  write(session: StoredSession<Result>): Promise<void> {
    const snapshot = JSON.stringify(session, null, 2);
    const file = join(this.directory, `${session.id}.json`);
    const write = this.writes
      .catch(() => {})
      .then(async () => {
        await mkdir(this.directory, { recursive: true });
        await writeFile(`${file}.tmp`, snapshot, { mode: 0o600 });
        await rename(`${file}.tmp`, file);
      });
    this.writes = write;
    return write;
  }
}
