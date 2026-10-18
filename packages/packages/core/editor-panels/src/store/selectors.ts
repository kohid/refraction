import { type SliceState } from '@refraction/store';

import type slice from './slice';

type State = SliceState< typeof slice >;

export const selectOpenId = ( state: State ) => state.panels.openId;
