/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
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

import {CookieWriter} from '../cookie-writer';
import * as cookie from '../../../../src/cookies';
import {dict} from '../../../../src/utils/object';

const TAG = '[amp-analytics/cookie-writer]'

describes.realWin('amp-analytics.cookie-writer', {
  amp: true,
  runtimeOn: true,
}, env => {

  let sandbox;
  let win;
  let doc;
  let setCookieSpy;
  let element;
  let ampdoc;

  beforeEach(() => {
    sandbox = env.sandbox;
    setCookieSpy = sandbox.spy();
    win = env.win;
    ampdoc = env.ampdoc;
    doc = win.document;
    sandbox.stub(cookie, 'setCookie').callsFake(
      (win, name, value, expirationTime) => {
        setCookieSpy(name, value);
    });
    element = doc.createElement('div');
    doc.body.appendChild(element);
  });

  describe('whenReady', () => {
    it('Resolve when no config', () => {
      const config = dict({});
      const cookieWriter = new CookieWriter(win, element, config);
      expect(setCookieSpy).to.not.be.called;
      return cookieWriter.whenReady();
    });

    it('Resovle when config is invalid', () => {
      const config = dict({
        'writeCookies': 'invalid',
      });
      expectAsyncConsoleError(TAG + ' writeCookies config must be an object');
      const cookieWriter = new CookieWriter(win, element, config);
      expect(setCookieSpy).to.not.be.called;
      return cookieWriter.whenReady();
    });

    it('Resolve when element is in FIE', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'testValue',
        },
      });
      const parent = doc.createElement('div');
      parent.classList.add('i-amphtml-fie');
      doc.body.appendChild(parent);
      parent.appendChild(element);
      expectAsyncConsoleError(TAG +
          ' writeCookies is disabled in friendly iframe');
      const cookieWriter = new CookieWriter(win, element, config);
      expect(setCookieSpy).to.not.be.called;
      return cookieWriter.whenReady();
    });

    it('Resolve when in viewer', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'testValue',
        },
      });
      const mockWin = {
        location: 'https://www-example-com.cdn.ampproject.org',
      }
      const cookieWriter = new CookieWriter(mockWin, element, config);
      expect(setCookieSpy).to.not.be.called;
      return cookieWriter.whenReady();
    });

    it('Resolve with nothing to write', () => {
      const config = dict({
        'writeCookies': {},
      });
      const cookieWriter = new CookieWriter(win, element, config);
      expect(setCookieSpy).to.not.be.called;
      return cookieWriter.whenReady();
    });
  });

  describe('Cookie value', () => {
    it('Write cookie', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'testValue'
        },
      });
      const cookieWriter = new CookieWriter(win, element, config);
      return cookieWriter.whenReady().then(() => {
        expect(setCookieSpy).to.be.calledOnce;
        expect(setCookieSpy).to.be.calledWith('testId', 'testValue');
      });
    });

    it('Write multiple cookie', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'testValue',
          'testId2': 'testValue2',
        },
      });
      const cookieWriter = new CookieWriter(win, element, config);
      return cookieWriter.whenReady().then(() => {
        expect(setCookieSpy).to.be.calledTwice;
        expect(setCookieSpy).to.be.calledWith('testId', 'testValue');
        expect(setCookieSpy).to.be.calledWith('testId2', 'testValue2');
      });
    });

    it('Expand whitelist macro', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'pre-QUERY_PARAM(noexist)',
          'testId2': 'pre-RANDOM',
        },
      });
      const cookieWriter = new CookieWriter(win, element, config);
      return cookieWriter.whenReady().then(() => {
        expect(setCookieSpy).to.be.calledTwice;;
        // QUERY_PARAM resolve to empty string
        expect(setCookieSpy).to.be.calledWith('testId', 'pre-');
        // Never try to resolve RANDOM
        expect(setCookieSpy).to.be.calledWith('testId2', 'pre-RANDOM');
      });
    });

    it('Do not write when string is empty', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'QUERY_PARAM(noexist)',
          'testId2': '',
        },
      });
      const cookieWriter = new CookieWriter(win, element, config);
      return cookieWriter.whenReady().then(() => {
        // Both cookie value resolve to empty string
        expect(setCookieSpy).to.not.be.called;
      });
    });

    it('Handle expandString error', () => {
      const config = dict({
        'writeCookies': {
          'testId': 'QUERY_PARAM',
          'testId2': 'testValue',
        },
      });
      const cookieWriter = new CookieWriter(win, element, config);
      expectAsyncConsoleError(TAG + ' Error expanding cookie string ' +
          'Error: The first argument to QUERY_PARAM, ' +
          'the query string param is required​​​');
      expectAsyncConsoleError('The first argument to QUERY_PARAM, ' +
          'the query string param is required')
      return cookieWriter.whenReady().then(() => {
        // Both cookie value resolve to empty string
        expect(setCookieSpy).to.be.calledOnce;
      });
    });
  });
});
