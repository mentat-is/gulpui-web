import { MessageTypes } from "../dto";

export const useStatus = (num: number): MessageTypes => between(num, 200, 299)
  ? 'ok'
  : (between(num, 300, 499)
    ? 'warning'
    : 'error'
  );

const between = (num: number, min: number, max: number) => num >= min && num <= max