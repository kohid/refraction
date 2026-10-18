import * as React from 'react';
import { InfoAlert } from '@refraction/editor-ui';
import { Grid, Stack } from '@elementor/ui';
import { __ } from '@wordpress/i18n';

import { PropKeyProvider } from '../../bound-prop-context';
import { ControlFormLabel } from '../../components/control-form-label';
import { useFormFieldSuggestions } from '../../hooks/use-form-field-suggestions';
import { ChipsControl } from '../chips-control';
import { MentionTextAreaControl } from '../mention-text-area-control';
import { SelectControl } from '../select-control';
import { EmailChipsField } from './email-chips-field';
import { EmailField } from './email-field';
import { shouldShowMentionsInfo } from './utils';

const FieldValueMentionField = ( {
	bind,
	label,
	placeholder,
}: {
	bind: string;
	label: string;
	placeholder?: string;
} ) => {
	const suggestions = useFormFieldSuggestions();

	return (
		<PropKeyProvider bind={ bind }>
			<Grid container direction="column" gap={ 0.5 }>
				<Grid item>
					<ControlFormLabel>{ label }</ControlFormLabel>
				</Grid>
				<Grid item>
					<MentionTextAreaControl suggestions={ suggestions } rows={ 1 } placeholder={ placeholder } />
				</Grid>
			</Grid>
		</PropKeyProvider>
	);
};

export const SendToField = ( { placeholder }: { placeholder?: string } ) => {
	const suggestions = useFormFieldSuggestions( { inputType: 'email' } );

	return (
		<PropKeyProvider bind="to">
			<Stack gap={ 0.5 }>
				<EmailChipsField
					fieldLabel={ __( 'Send to', 'refraction' ) }
					placeholder={ placeholder }
					suggestions={ suggestions }
				/>
				{ shouldShowMentionsInfo() && (
					<InfoAlert>
						{ __( 'Type @ or an email field name to insert its submitted value.', 'refraction' ) }
					</InfoAlert>
				) }
			</Stack>
		</PropKeyProvider>
	);
};

export const SubjectField = () => (
	<FieldValueMentionField
		bind="subject"
		label={ __( 'Email subject', 'refraction' ) }
		placeholder={ __( 'New form submission', 'refraction' ) }
	/>
);

export const MessageField = () => {
	const suggestions = useFormFieldSuggestions();

	return (
		<PropKeyProvider bind="message">
			<Grid container direction="column" gap={ 0.5 }>
				<Grid item>
					<ControlFormLabel>{ __( 'Message', 'refraction' ) }</ControlFormLabel>
				</Grid>
				<Grid item>
					<MentionTextAreaControl suggestions={ suggestions } />
				</Grid>
				<Grid item>
					<InfoAlert>
						{ shouldShowMentionsInfo()
							? __(
									'[all-fields] shortcode sends all fields. Type @ to insert specific fields and customize your message.',
									'refraction'
							  )
							: __( '[all-fields] shortcode sends all fields.', 'refraction' ) }
					</InfoAlert>
				</Grid>
			</Grid>
		</PropKeyProvider>
	);
};

export const FromEmailField = () => (
	<EmailField
		bind="from"
		label={ __( 'From email', 'refraction' ) }
		placeholder={ __( 'What email should appear as the sender?', 'refraction' ) }
	/>
);

export const FromNameField = () => (
	<FieldValueMentionField
		bind="from-name"
		label={ __( 'From name', 'refraction' ) }
		placeholder={ __( 'What name should appear as the sender?', 'refraction' ) }
	/>
);

export const ReplyToField = () => {
	const emailSuggestions = useFormFieldSuggestions( { inputType: 'email' } );

	return (
		<PropKeyProvider bind="reply-to">
			<Grid container direction="column" gap={ 0.5 }>
				<Grid item>
					<ControlFormLabel>{ __( 'Reply-to', 'refraction' ) }</ControlFormLabel>
				</Grid>
				<Grid item>
					<MentionTextAreaControl
						suggestions={ emailSuggestions }
						rows={ 1 }
						triggerPosition="start"
						placeholder={ __( 'You can type @ to insert an email field', 'refraction' ) }
					/>
				</Grid>
			</Grid>
		</PropKeyProvider>
	);
};

export const CcField = () => {
	const suggestions = useFormFieldSuggestions( { inputType: 'email' } );

	return (
		<PropKeyProvider bind="cc">
			<EmailChipsField fieldLabel={ __( 'Cc', 'refraction' ) } suggestions={ suggestions } />
		</PropKeyProvider>
	);
};

export const BccField = () => {
	const suggestions = useFormFieldSuggestions( { inputType: 'email' } );

	return (
		<PropKeyProvider bind="bcc">
			<EmailChipsField fieldLabel={ __( 'Bcc', 'refraction' ) } suggestions={ suggestions } />
		</PropKeyProvider>
	);
};

export const MetaDataField = () => (
	<PropKeyProvider bind="meta-data">
		<Stack gap={ 0.5 }>
			<ControlFormLabel>{ __( 'Metadata', 'refraction' ) }</ControlFormLabel>
			<ChipsControl
				options={ [
					{ label: __( 'Date', 'refraction' ), value: 'date' },
					{ label: __( 'Time', 'refraction' ), value: 'time' },
					{ label: __( 'Page URL', 'refraction' ), value: 'page-url' },
					{ label: __( 'User agent', 'refraction' ), value: 'user-agent' },
					{ label: __( 'Credit', 'refraction' ), value: 'credit' },
				] }
			/>
		</Stack>
	</PropKeyProvider>
);

export const SendAsField = () => (
	<PropKeyProvider bind="send-as">
		<Grid container direction="column" gap={ 0.5 }>
			<Grid item>
				<ControlFormLabel>{ __( 'Send as', 'refraction' ) }</ControlFormLabel>
			</Grid>
			<Grid item>
				<SelectControl
					options={ [
						{ label: __( 'HTML', 'refraction' ), value: 'html' },
						{ label: __( 'Plain Text', 'refraction' ), value: 'plain' },
					] }
				/>
			</Grid>
		</Grid>
	</PropKeyProvider>
);
