import { enable, disable } from './overlay/no-bounce'
import focusLock from 'dom-focus-lock'
import ctEvents from 'ct-events'

import { mount as mountMobileMenu } from './overlay/mobile-menu'

let focusLockToUse = focusLock

if (window.ctFrontend && window.ctFrontend.focusLock) {
	focusLockToUse = ctFrontend.focusLock
} else {
	window.ctFrontend = window.ctFrontend || {}
	window.ctFrontend.focusLock = focusLockToUse
}

const showOffcanvas = (settings) => {
	settings = {
		onClose: () => {},
		container: null,
		focus: true,
		...settings,
	}
	;[...document.querySelectorAll(`[href*="${settings.container.id}"]`)].map(
		(trigger) => {
			trigger.classList.add('active')
		}
	)

	if (settings.focus) {
		setTimeout(() => {
			settings.container.querySelector('input') &&
				settings.container.querySelector('input').focus()
		}, 200)
	}

	if (settings.container.querySelector('.ct-panel-content')) {
		settings.container
			.querySelector('.ct-panel-content')
			.addEventListener('click', (event) => {
				Array.from(settings.container.querySelectorAll('select')).map(
					(select) =>
						select.selectr && select.selectr.events.dismiss(event)
				)
			})
	}

	if (
		settings.clickOutside &&
		settings.container.querySelector('.ct-panel-content')
	) {
		settings.container.addEventListener(
			'click',
			settings.handleContainerClick
		)
	}

	const onKeyUp = (event) => {
		const { keyCode, target } = event

		if (keyCode !== 27) return
		event.preventDefault()

		document.body.hasAttribute('data-panel') && hideOffcanvas(settings)

		document.removeEventListener('keyup', onKeyUp)
	}

	document.addEventListener('keyup', onKeyUp)

	let maybeCloseButton =
		settings.container &&
		settings.container.querySelector('.ct-toggle-close')

	if (maybeCloseButton) {
		maybeCloseButton.addEventListener(
			'click',
			(event) => {
				event.preventDefault()
				hideOffcanvas(settings)
			},
			{ once: true }
		)

		if (!maybeCloseButton.hasEnterListener) {
			maybeCloseButton.hasEnterListener = true

			maybeCloseButton.addEventListener('keyup', (e) => {
				if (13 == e.keyCode) {
					e.preventDefault()
					hideOffcanvas(settings)
				}
			})
		}
	}

	if (
		settings.computeScrollContainer ||
		settings.container.querySelector('.ct-panel-content')
	) {
		disable(
			settings.computeScrollContainer
				? settings.computeScrollContainer()
				: settings.container.querySelector('.ct-panel-content')
		)

		setTimeout(() => {
			focusLockToUse.on(
				settings.container.querySelector('.ct-panel-content').parentNode
			)
		})
	}

	/**
	 * Add window event listener in the next frame. This allows us to freely
	 * propagate the current clck event up the chain -- without the modal
	 * getting closed.
	 */
	requestAnimationFrame(() => {
		window.addEventListener('click', settings.handleWindowClick)
	})

	ctEvents.trigger('ct:modal:opened', settings.container)
	;[...settings.container.querySelectorAll('.ct-toggle-dopdown-mobile')].map(
		(arrow) => {
			mountMobileMenu(arrow)
		}
	)
}

const hideOffcanvas = (settings, args = {}) => {
	settings = {
		onClose: () => {},
		container: null,
		...settings,
	}

	args = {
		closeInstant: false,
		...args,
	}

	if (!document.body.hasAttribute('data-panel')) {
		settings.container.classList.remove('active')
		settings.onClose()
		return
	}

	;[...document.querySelectorAll(`[href*="${settings.container.id}"]`)].map(
		(trigger) => {
			trigger.classList.remove('active')
		}
	)

	settings.container.classList.remove('active')

	if (args.closeInstant) {
		document.body.removeAttribute('data-panel')
		ctEvents.trigger('ct:modal:closed', settings.container)

		enable(
			settings.computeScrollContainer
				? settings.computeScrollContainer()
				: settings.container.querySelector('.ct-panel-content')
		)
	} else {
		document.body.dataset.panel = `out`

		settings.container.addEventListener(
			'transitionend',
			() => {
				setTimeout(() => {
					document.body.removeAttribute('data-panel')
					ctEvents.trigger('ct:modal:closed', settings.container)

					enable(
						settings.computeScrollContainer
							? settings.computeScrollContainer()
							: settings.container.querySelector(
									'.ct-panel-content'
							  )
					)

					focusLockToUse.off(
						settings.container.querySelector('.ct-panel-content')
							.parentNode
					)
				}, 300)
			},
			{ once: true }
		)
	}

	window.removeEventListener('click', settings.handleWindowClick)

	settings.container.removeEventListener(
		'click',
		settings.handleContainerClick
	)

	settings.onClose()
}

export const handleClick = (e, settings) => {
	if (e && e.preventDefault) {
		e.preventDefault()
	}

	settings = {
		onClose: () => {},
		container: null,
		focus: false,
		clickOutside: true,
		isModal: false,
		computeScrollContainer: null,
		closeWhenLinkInside: false,
		handleContainerClick: (event) => {
			let isInsidePanelContent = event.target.closest('.ct-panel-content')
			let isPanelContentItself =
				[
					...settings.container.querySelectorAll('.ct-panel-content'),
				].indexOf(event.target) > -1

			if (
				(settings.isModal &&
					!isPanelContentItself &&
					isInsidePanelContent) ||
				(!settings.isModal &&
					(isPanelContentItself || isInsidePanelContent)) ||
				event.target.closest('[class*="select2-container"]')
			) {
				return
			}

			if (window.getSelection().toString().length > 0) {
				return
			}

			document.body.hasAttribute('data-panel') && hideOffcanvas(settings)
		},
		handleWindowClick: (e) => {
			if (
				settings.container.contains(e.target) ||
				e.target === document.body ||
				event.target.closest('[class*="select2-container"]')
			) {
				return
			}

			if (
				e.target.classList.contains('ct-header-trigger') ||
				e.target.closest('.ct-header-trigger') ||
				e.target.classList.contains('ct-offcanvas-trigger') ||
				e.target.closest('.ct-offcanvas-trigger')
			) {
				return
			}

			document.body.hasAttribute('data-panel') && hideOffcanvas(settings)
		},
		...settings,
	}

	showOffcanvas(settings)

	/*
	if (document.body.hasAttribute('data-panel')) {
		if (
			settings.isModal &&
			!settings.container.classList.contains('active')
		) {
			const menuToggle = document.querySelector('.ct-header-trigger')

			if (menuToggle) {
				menuToggle.click()
			}

			setTimeout(() => {
				showOffcanvas(settings)
			}, 600)
		} else {
			hideOffcanvas(settings)
		}
	} else {
		showOffcanvas(settings)
	}
*/

	if (settings.closeWhenLinkInside) {
		if (!settings.container.hasListener) {
			settings.container.hasListener = true

			settings.container.addEventListener('click', (event) => {
				if (event.target && event.target.matches('a')) {
					hideOffcanvas(settings, {
						closeInstant:
							event.target.getAttribute('href')[0] !== '#',
					})
				}
			})
		}
	}
}

ctEvents.on('ct:offcanvas:force-close', (settings) => hideOffcanvas(settings))

export const mount = (el, { event, focus = false }) => {
	handleClick(event, {
		isModal: true,
		container: document.querySelector(el.hash),
		clickOutside: true,
		focus,
	})
}
