// Type definitions for jquery-datatables-checkboxes
// Project: https://www.gyrocode.com/projects/jquery-datatables-checkboxes/

/// <reference types="jquery" />

import DataTables, {Api} from 'datatables.net';

export default DataTables;

declare module 'datatables.net' {
    interface ConfigColumns {
        /**
         * Checkboxes plugin options
         */
        checkboxes?: boolean | ConfigColumnsCheckboxes;
    }

    interface ConfigColumnsCheckboxes {
        /**
         * Enable / disable checkbox state loading/saving if state saving is enabled globally.
         */
        stateSave?: boolean;

        /**
         * Enable / disable row selection.
         */
        selectRow?: boolean;

        /**
         * Enable / disable "select all" control in the header.
         */
        selectAll?: boolean;

        /**
         * Enable / disable ability to select checkboxes from all pages.
         */
        selectAllPages?: boolean;

        /**
         * Checkbox select/deselect callback.
         */
        selectCallback?: FunctionCheckboxesSelectCallback;

        /**
         * "Select all" control select/deselect callback.
         */
        selectAllCallback?: FunctionCheckboxesSelectCallback;

        /**
         * "Select all" control markup.
         */
        selectAllRender?: string

    }

    interface ApiCellMethods<T> {
        checkboxes?: ApiCellCheckboxes<T>
    }

    interface ApiCellsMethods<T> {
        checkboxes?: ApiCellsCheckboxes<T>
    }

    interface ApiColumnMethods {
        checkboxes?: ApiColumnCheckboxes
    }

    interface ApiColumnsMethods {
        checkboxes?: ApiColumnsCheckboxes
    }

    interface ApiCellCheckboxes<T> extends Omit<Api<T>, 'render'> {
        /**
         * Checks a checkbox in a cell.
         */
        select(state?: boolean): Api<T>;

        /**
         * Unchecks a checkbox in a cell.
         */
        deselect(state?: boolean): Api<T>;

        /**
         * Enables a checkbox in a cell.
         */
        enable(state?: boolean): Api<T>;

        /**
         * Disables a checkbox in a cell.
         */
        disable(state?: boolean): Api<T>;
    }

    interface ApiCellsCheckboxes<T> extends Omit<Api<T>, 'render'> {
        /**
         * Checks a checkbox in multiple cells.
         */
        select(state?: boolean): Api<T>;

        /**
         * Unchecks a checkbox in multiple cells.
         */
        deselect(state?: boolean): Api<T>;

        /**
         * Enables a checkbox in multiple cells.
         */
        enable(state?: boolean): Api<T>;

        /**
         * Disables a checkbox in multiple cells.
         */
        disable(state?: boolean): Api<T>;
    }

    interface ApiColumnCheckboxes {
        /**
         * Checks checkboxes in a column.
         */
        select(state?: boolean): Api<any>;

        /**
         * Unchecks checkboxes in a column.
         */
        deselect(state?: boolean): Api<any>;

        /**
         * Unchecks all checkboxes in a column.
         */
        deselectAll(): Api<any>;

        /**
         * Retrieves data for selected checkboxes in a column.
         */
        selected(): Api<any>;
    }

    interface ApiColumnsCheckboxes {
        /**
         * Checks checkboxes in multiple columns.
         */
        select(state?: boolean): Api<any>;

        /**
         * Unchecks checkboxes in multiple columns.
         */
        deselect(state?: boolean): Api<any>;

        /**
         * Unchecks all checkboxes in multiple columns.
         */
        deselectAll(): Api<any>;

        /**
         * Retrieves data for selected checkboxes in multiple columns.
         */
        selected(): Api<any>;
    }
}

type FunctionCheckboxesSelectCallback = (nodes: Node[], selected: boolean) => void;

type FunctionCheckboxesSelectAllCallback = (nodes: Node[], selected: boolean, indeterminate: boolean) => void;
