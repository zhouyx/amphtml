/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
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

import {CommonSignals} from '../../../src/common-signals';
import {Observable} from '../../../src/observable';
import {getDataParamsFromAttributes} from '../../../src/dom';
import {user} from '../../../src/log';

const VARIABLE_DATA_ATTRIBUTE_KEY = /^vars(.+)/;
const NO_UNLISTEN = function() {};


/**
 * The analytics event.
 */
export class AnalyticsEvent {
  /**
   * @param {!Element} target The most relevant target element.
   * @param {string} type The type of event.
   * @param {!Object<string, string>=} opt_vars A map of vars and their values.
   */
  constructor(target, type, opt_vars) {
    /** @const */
    this.target = target;
    /** @const */
    this.type = type;
    /** @const */
    this.vars = opt_vars || Object.create(null);
  }
}


/**
 * The base class for all trackers. A tracker tracks all events of the same
 * type for a single analytics root.
 *
 * @implements {../../../src/service.Disposable}
 * @abstract
 * @visibleForTesting
 */
export class EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    /** @const */
    this.root = root;
  }

  /** @override @abstract */
  dispose() {}

  /**
   * @param {!Element} unusedContext
   * @param {string} unusedEventType
   * @param {!JSONType} unusedConfig
   * @param {function(!AnalyticsEvent)} unusedListener
   * @return {!UnlistenDef}
   * @abstract
   */
  add(unusedContext, unusedEventType, unusedConfig, unusedListener) {}
}


/**
 * Tracks custom events.
 */
export class CustomEventTracker extends EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    super(root);

    /** @const @private {!Object<string, !Observable<!AnalyticsEvent>>} */
    this.observers_ = {};

    /**
     * Early events have to be buffered because there's no way to predict
     * how fast all `amp-analytics` elements will be instrumented.
     * @private {!Object<string, !Array<!AnalyticsEvent>>|undefined}
     */
    this.buffer_ = {};

    // Stop buffering of custom events after 10 seconds. Assumption is that all
    // `amp-analytics` elements will have been instrumented by this time.
    setTimeout(() => {
      this.buffer_ = undefined;
    }, 10000);
  }

  /** @override */
  dispose() {
    this.buffer_ = undefined;
    for (const k in this.observers_) {
      this.observers_[k].removeAll();
    }
  }

  /** @override */
  add(context, eventType, config, listener) {
    // Push recent events if any.
    const buffer = this.buffer_ && this.buffer_[eventType];
    if (buffer) {
      setTimeout(() => {
        buffer.forEach(event => {
          listener(event);
        });
      }, 1);
    }

    let observers = this.observers_[eventType];
    if (!observers) {
      observers = new Observable();
      this.observers_[eventType] = observers;
    }
    return observers.add(listener);
  }

  /**
   * Triggers a custom event for the associated root.
   * @param {!AnalyticsEvent} event
   */
  trigger(event) {
    // Buffer still exists - enqueue.
    if (this.buffer_) {
      let buffer = this.buffer_[event.type];
      if (!buffer) {
        buffer = [];
        this.buffer_[event.type] = buffer;
      }
      buffer.push(event);
    }

    // If listeners already present - trigger right away.
    const observers = this.observers_[event.type];
    if (observers) {
      observers.fire(event);
    }
  }
}


/**
 * Tracks click events.
 */
export class ClickEventTracker extends EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    super(root);

    /** @private {!Observable<!Event>} */
    this.clickObservable_ = new Observable();

    /** @private @const */
    this.boundOnClick_ = e => {
      this.clickObservable_.fire(e);
    };
    this.root.getRoot().addEventListener('click', this.boundOnClick_);
  }

  /** @override */
  dispose() {
    this.root.getRoot().removeEventListener('click', this.boundOnClick_);
    this.clickObservable_.removeAll();
  }

  /** @override */
  add(context, eventType, config, listener) {
    let selector = user().assert(config['selector'],
        'Missing required selector on click trigger');
    const isScoped = !!config['isScoped'];
    let selectionMethod = config['selectionMethod'] || null;
    selectionMethod = isScoped ? 'scope' : selectionMethod;
    selector = isScoped && selector == ':root' ? ':scope' : selector;
    return this.clickObservable_.add(this.root.createSelectiveListener(
        this.handleClick_.bind(this, listener),
        (context.parentElement || context),
        selector,
        selectionMethod));
  }

  /**
   * @param {function(!AnalyticsEvent)} listener
   * @param {!Element} target
   * @param {!Event} unusedEvent
   * @private
   */
  handleClick_(listener, target, unusedEvent) {
    const params = getDataParamsFromAttributes(
        target,
        /* computeParamNameFunc */ undefined,
        VARIABLE_DATA_ATTRIBUTE_KEY);
    listener(new AnalyticsEvent(target, 'click', params));
  }
}


/**
 * Tracks events based on signals.
 */
export class SignalTracker extends EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    super(root);
  }

  /** @override */
  dispose() {
  }

  /** @override */
  add(context, eventType, config, listener) {
    let target;
    let signalsPromise;
    let selector = config['selector'] || ':root';
    const isScoped = !!config['isScoped'];
    selector = isScoped && (!!selector == ':root' || selector == ':host')
        ? ':scope' : selector;
    if (!!selector == ':root' || selector == ':host') {
      // Root selectors are delegated to analytics roots.
      target = this.root.getRootElement();
      signalsPromise = Promise.resolve(this.root.signals());
    } else {
      // Look for the AMP-element. Wait for DOM to be fully parsed to avoid
      // false missed searches.
      signalsPromise = this.root.ampdoc.whenReady().then(() => {
        const selectionMethod = isScoped ? 'scope' : config['selectionMethod'];
        const element = user().assertElement(
            this.root.getAmpElement(
                (context.parentElement || context),
                selector,
                selectionMethod),
            `Element "${selector}" not found`);
        target = element;
        return element.signals();
      });
    }

    // Wait for the target and the event signal.
    signalsPromise.then(signals => signals.whenSignal(eventType)).then(() => {
      listener(new AnalyticsEvent(target, eventType));
    });
    return NO_UNLISTEN;
  }
}


/**
 * Tracks when the elements in the first viewport has been loaded - "ini-load".
 */
export class IniLoadTracker extends EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    super(root);
  }

  /** @override */
  dispose() {
  }

  /** @override */
  add(context, eventType, config, listener) {
    let target;
    let promise;
    let selector = config['selector'] || ':root';
    const isScoped = !!config['isScoped'];
    selector = isScoped && (!!selector == ':root' || selector == ':host')
        ? ':scope' : selector;
    if (selector == ':root' || selector == ':host') {
      // Root selectors are delegated to analytics roots.
      target = this.root.getRootElement();
      promise = this.getRootSignal();
    } else {
      // An AMP-element. Wait for DOM to be fully parsed to avoid
      // false missed searches.
      promise = this.root.ampdoc.whenReady().then(() => {
        const selectionMethod = isScoped ? 'scope' : config['selectionMethod'];
        const element = user().assertElement(
            this.root.getAmpElement(
                (context.parentElement || context),
                selector,
                selectionMethod),
            `Element "${selector}" not found`);
        target = element;
        return this.getElementSignal(element);
      });
    }
    // Wait for the target and the event.
    promise.then(() => {
      listener(new AnalyticsEvent(target, eventType));
    });
    return NO_UNLISTEN;
  }

  /**
   * @return {!Promise}
   */
  getRootSignal() {
    return this.root.whenIniLoaded();
  }

  /**
   * @param {!Element} element
   * @return {!Promise}
   */
  getElementSignal(element) {
    if (typeof element.signals != 'function') {
      return Promise.resolve();
    }
    const signals = element.signals();
    return Promise.race([
      signals.whenSignal(CommonSignals.INI_LOAD),
      signals.whenSignal(CommonSignals.LOAD_END),
    ]);
  }
}


/**
 * Tracks visibility events.
 */
export class VisibilityTracker extends EventTracker {
  /**
   * @param {!./analytics-root.AnalyticsRoot} root
   */
  constructor(root) {
    super(root);
    /** @const @private */
    this.iniLoadTracker_ = new IniLoadTracker(root);
  }

  /** @override */
  dispose() {
  }

  /** @override */
  add(context, eventType, config, listener) {
    const visibilitySpec = config['visibilitySpec'] || {};
    let selector = config['selector'] || visibilitySpec['selector'];
    const visibilityManager = this.root.getVisibilityManager();
    const isScoped = !!config['isScoped'];
    selector =
        isScoped && (!!selector == ':root' || selector == ':host' || !selector)
        ? ':scope' : selector;

    // Root selectors are delegated to analytics roots.
    if (!selector || selector == ':root' || selector == ':host') {
      // When `selector` is specified, we always use "ini-load" signal as
      // a "ready" signal.
      const readyPromise = selector ?
          this.iniLoadTracker_.getRootSignal() :
          null;
      return visibilityManager.listenRoot(
          visibilitySpec,
          readyPromise,
          this.onEvent_.bind(
              this, eventType, listener, this.root.getRootElement()));
    }

    // An AMP-element. Wait for DOM to be fully parsed to avoid
    // false missed searches.
    const unlistenPromise = this.root.ampdoc.whenReady().then(() => {
      const selectionMethod = isScoped ? 'scope'
          : (config['selectionMethod'] || visibilitySpec['selectionMethod']);
      const element = user().assertElement(
          this.root.getAmpElement(
              (context.parentElement || context),
              selector,
              selectionMethod),
          `Element "${selector}" not found`);
      return visibilityManager.listenElement(
          element,
          visibilitySpec,
          this.iniLoadTracker_.getElementSignal(element),
          this.onEvent_.bind(this, eventType, listener, element));
    });
    return function() {
      unlistenPromise.then(unlisten => {
        unlisten();
      });
    };
  }

  /**
   * @param {string} eventType
   * @param {function(!AnalyticsEvent)} listener
   * @param {!Element} target
   * @param {!Object<string, *>} state
   * @private
   */
  onEvent_(eventType, listener, target, state) {
    const attr = getDataParamsFromAttributes(
        target,
        /* computeParamNameFunc */ undefined,
        VARIABLE_DATA_ATTRIBUTE_KEY);
    for (const key in attr) {
      state[key] = attr[key];
    }
    listener(new AnalyticsEvent(target, eventType, state));
  }
}
