export type { User } from './User.dto'
export type { Login } from './Login.dto';
export type { Children } from './Children.dto';
export type { λApp } from './App.dto';
export { BaseInfo } from './App.dto'
export type { ElasticListIndex } from './ElasticListIndex.dto'
export type { ElasticGetMapping, ElasticGetMappingUnit } from './ElasticGetMapping.dto'
export type { λOperation } from './Operation.dto';
export type { OperationsList } from './OperationsList.dto';
export type { Message, MessageTypes } from './Message.dto'
export { λ } from './λ.class';

export const SECOND = 1000
export const MINUTE = SECOND * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const WEEK = DAY * 7
export const MONTH = WEEK * 4