/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Copies values of all enumerable own properties from one or more source
 * objects (provided as extended arguments to the function) to a target object.
 *
 * @param {!Object} target
 * @returns {!Object}
 */

const INIT_TIME = Date.now();

/**
 * @return {number}
 */
export function now() {
  return Date.now() - INIT_TIME;
}

/**
 * Sets the performance.now polyfill if it does not exist.
 * @param {!Window} win
 */
export function install(win) {
  if (!win.performance) {
    win.performance = {};
  }
  if (!win.performance.now) {
    win.performance.now = now;
  }
}
