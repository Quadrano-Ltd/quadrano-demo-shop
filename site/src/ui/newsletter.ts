import { pushNewsletterSignup } from '../datalayer/push.ts';

/**
 * Footer newsletter sign-up: the real-world trigger for the custom
 * `newsletter_signup` event. It always makes the correct push; the opt-in-as-text
 * variant lives in the event playground only.
 *
 * The email address is never pushed, stored or sent anywhere (no PII in the data
 * layer). The opt-in box starts unticked, as UK consent rules expect, and its
 * state becomes the `marketing_opt_in` Attribute.
 */
export function createNewsletterForm(announce: (message: string) => void): HTMLElement {
  const form = document.createElement('form');
  form.className = 'newsletter';
  form.noValidate = true;
  form.setAttribute('aria-labelledby', 'newsletter-heading');

  const heading = document.createElement('h2');
  heading.id = 'newsletter-heading';
  heading.className = 'newsletter__heading';
  heading.textContent = 'Join the newsletter';

  const emailLabel = document.createElement('label');
  emailLabel.htmlFor = 'newsletter-email';
  emailLabel.textContent = 'Email';

  const email = document.createElement('input');
  email.id = 'newsletter-email';
  email.type = 'email';
  email.autocomplete = 'email';
  email.className = 'newsletter__email';

  const optInLabel = document.createElement('label');
  optInLabel.className = 'newsletter__opt-in';
  const optIn = document.createElement('input');
  optIn.type = 'checkbox';
  optIn.id = 'newsletter-opt-in';
  optInLabel.append(optIn, ' Send me offers and new arrivals');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Sign up';

  const note = document.createElement('p');
  note.className = 'newsletter__note';
  note.textContent = 'Demo only: your email is not sent or stored.';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    pushNewsletterSignup({ location: 'footer', marketingOptIn: optIn.checked });
    email.value = '';
    optIn.checked = false;
    announce('Pushed newsletter_signup');
  });

  const row = document.createElement('div');
  row.className = 'newsletter__row';
  row.append(email, submit);

  form.append(heading, emailLabel, row, optInLabel, note);
  return form;
}
