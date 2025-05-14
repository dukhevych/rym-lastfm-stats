import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';
import * as constants from '@/helpers/constants.js';

import './background/runtime/onInstalled.js';
import './background/fetchImage.js';
import './background/runtime/onMessage/get-and-watch-object-field.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
