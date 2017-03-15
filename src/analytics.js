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

import {
  getElementServiceForDoc,
  getElementServiceIfAvailableForDoc,
} from './element-service';
import {createElementWithAttributes} from './dom';
import {getAmpDoc} from './ampdoc';


/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<!../extensions/amp-analytics/0.1/instrumentation.InstrumentationService>}
 */
export function analyticsForDoc(nodeOrDoc) {
  return (/** @type {!Promise<
            !../extensions/amp-analytics/0.1/instrumentation.InstrumentationService
          >} */ (getElementServiceForDoc(
                nodeOrDoc, 'amp-analytics-instrumentation', 'amp-analytics')));
};

/**
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @return {!Promise<?../extensions/amp-analytics/0.1/instrumentation.InstrumentationService>}
 */
export function analyticsForDocOrNull(nodeOrDoc) {
  return (/** @type {!Promise<
            ?../extensions/amp-analytics/0.1/instrumentation.InstrumentationService
          >} */ (getElementServiceIfAvailableForDoc(
                nodeOrDoc, 'amp-analytics-instrumentation', 'amp-analytics')));
};

/**
 * Helper method to trigger analytics event if amp-analytics is available.
 * @param {!Node|!./service/ampdoc-impl.AmpDoc} nodeOrDoc
 * @param {string} eventType
 * @param {!Object<string, string>=} opt_vars A map of vars and their values.
 */
export function triggerAnalyticsEvent(nodeOrDoc, eventType, opt_vars) {
  analyticsForDocOrNull(nodeOrDoc).then(analytics => {
    if (!analytics) {
      return;
    }
    analytics.triggerEventForTarget(nodeOrDoc, eventType, opt_vars);
  });
}

/**
 * Helper method to create analytics element for specific root.
 * @param {!Element} element
 * @param {!JSONType} config
 * @param {Document=} parentDoc
 * @return {!Promise}
 */
export function insertAnalyticsElement(element, config, parentDoc) {
  // Note: Require including analytics script
  return analyticsForDocOrNull(element).then(analytics => {
    if (!analytics) {
      return;
    }
    // Create analytics element;
    parentDoc = parentDoc || getAmpDoc(element).win.document;
    const analyticsElem = parentDoc.createElement('amp-analytics');
    analyticsElem.setAttribute('scoped', 'true');
    const scriptElem = createElementWithAttributes(parentDoc,
        'script', {
          'type': 'application/json',
        });
    scriptElem.textContent = JSON.stringify(config);
    analyticsElem.appendChild(scriptElem);
    element.appendChild(analyticsElem);
    console.log('asdfw');
    return analyticsElem;
    // TODO: create analytics root to scope analytics in this specifc node.
  });
}
