let globalTimeOffset = 0; // offset in milliseconds

export const timeService = {
  /**
   * Returns the simulated current time.
   */
  getCurrentTime(): Date {
    if (globalTimeOffset === 0) {
      return new Date();
    }
    return new Date(Date.now() + globalTimeOffset);
  },

  /**
   * Sets the time offset in milliseconds.
   * Positive value advances into the future.
   */
  setOffset(milliseconds: number): void {
    globalTimeOffset = milliseconds;
    console.log(`[TimeService] Simulando horario: ${this.getCurrentTime().toLocaleString()}`);
  },

  /**
   * Resets the time back to real time.
   */
  reset(): void {
    globalTimeOffset = 0;
    console.log(`[TimeService] Reloj reiniciado a tiempo real.`);
  },

  /**
   * Gets current offset.
   */
  getOffset(): number {
    return globalTimeOffset;
  }
};
