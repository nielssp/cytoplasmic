import { Component } from "../component";

export class PivotTableRow extends Component<HTMLTableRowElement> {
    private header: HTMLTableCellElement;

    constructor(private table: PivotTable) {
        super(document.createElement('tr'));
        this.header = document.createElement('th');
        this.header.scope = 'row';
        this.elem.appendChild(this.header);
        this.table.columns.forEach(column => column.createCell(this));
    }

    get name(): string|null {
        return this.header.textContent;
    }

    set name(name: string|null) {
        this.header.textContent = name;
    }

    addCellClass(cell: number, className: string) {
        this.elem.cells[cell + 1].classList.add(className);
    }

    removeCellClass(cell: number, className: string) {
        this.elem.cells[cell + 1].classList.remove(className);
    }

    set(cell: number, value: string) {
        this.elem.cells[cell + 1].textContent = value;
    }

    fill(value: string) {
        for (let i = 1; i < this.elem.cells.length; i++) {
            this.elem.cells[i].textContent = value;
        }
    }

    clear() {
        this.fill('');
    }
}

export class PivotTableSection extends Component<HTMLTableSectionElement> {
    header: HTMLTableRowElement|null = null;
    rows: PivotTableRow[] = [];
    subtotal: PivotTableRow|null = null;

    constructor(private table: PivotTable, section: HTMLTableSectionElement) {
        super(section);
    }

    get name(): string|null {
        if (!this.header) {
            return null;
        }
        return this.header.cells[0].textContent;
    }

    set name(name: string|null) {
        if (name) {
            if (!this.header) {
                this.header = this.elem.insertRow(0);
                this.header.classList.add('pivot-section-header');
                const cell = document.createElement('th');
                cell.scope = 'row';
                cell.colSpan = this.table.columns.length + 1;
                this.header.appendChild(cell);
            }
            this.header.cells[0].textContent = name;
        } else if (this.header) {
            this.header.parentElement?.removeChild(this.header);
        }
    }

    addRow(name: string|null = null): PivotTableRow {
        const row = new PivotTableRow(this.table);
        row.name = name;
        this.rows.push(row);
        if (this.subtotal) {
            this.elem.insertBefore(row.elem, this.subtotal.elem);
        } else {
            this.elem.appendChild(row.elem);
        }
        return row;
    }

    clear() {
        this.rows.forEach(row => this.elem.removeChild(row.elem));
        this.rows = [];
    }

    addSubtotal(name: string|null = null): PivotTableRow {
        if (!this.subtotal) {
            this.subtotal = new PivotTableRow(this.table);
            this.subtotal.classList.add('pivot-subtotal');
            this.subtotal.name = name;
            this.elem.appendChild(this.subtotal.elem);
        }
        return this.subtotal;
    }
}

export class PivotTableColumn extends Component<HTMLTableColElement> {
    header: HTMLTableCellElement = document.createElement('th');
    cellClasses: string[] = [];

    constructor(private table: PivotTable, public index: number) {
        super(document.createElement('col'));
        this.header.scope = 'col';
    }

    get number(): boolean {
        return this.header.classList.contains('pivot-number');
    }

    set number(number: boolean) {
        if (number) {
            this.header.classList.add('pivot-number');
            this.addCellClass('pivot-number');
        } else {
            this.header.classList.remove('pivot-number');
            this.removeCellClass('pivot-number');
        }
    }

    get name(): string|null {
        return this.header.textContent;
    }

    set name(name: string|null) {
        this.header.textContent = name;
    }

    addCellClass(className: string) {
        this.cellClasses.push(className);
        this.table.forEachRow(row => {
            row.addCellClass(this.index, className);
        });
    }

    removeCellClass(className: string) {
        this.cellClasses = this.cellClasses.filter(c => c !== className);
        this.table.forEachRow(row => {
            row.removeCellClass(this.index, className);
        });
    }

    createCell(row: PivotTableRow) {
        const cell = row.elem.insertCell();
        for (let className of this.cellClasses) {
            cell.classList.add(className);
        }
    }
}

export class PivotTable extends Component<HTMLTableElement> {
    private head: HTMLTableSectionElement;
    private headRow: HTMLTableRowElement;
    private colGroup: HTMLTableColElement = document.createElement('colgroup');
    private header: HTMLTableCellElement = document.createElement('th');
    sections: PivotTableSection[] = [];
    columns: PivotTableColumn[] = [];
    total: PivotTableRow|null = null;

    constructor() {
        super(document.createElement('table'));
        this.classList.add('pivot-table');
        this.elem.appendChild(this.colGroup);
        this.head = this.elem.createTHead();
        this.headRow = this.head.insertRow();
        this.headRow.appendChild(this.header);
    }

    get name(): string|null {
        return this.header.textContent;
    }

    set name(name: string|null) {
        this.header.textContent = name;
    }

    addColumn(name: string, number: boolean = false): PivotTableColumn {
        const column = new PivotTableColumn(this, this.columns.length);
        column.name = name;
        column.number = number;
        this.columns.push(column);
        this.colGroup.appendChild(column.elem);
        this.headRow.appendChild(column.header);
        this.sections.forEach(section => {
            if (section.header) {
                section.header.cells[0].colSpan += 1;
            }
            section.rows.forEach(row => column.createCell(row));
            if (section.subtotal) {
                column.createCell(section.subtotal);
            }
        });
        if (this.total) {
            column.createCell(this.total);
        }
        return column;
    }

    addSection(name: string|null = null): PivotTableSection {
        const section = new PivotTableSection(this, this.elem.createTBody());
        section.name = name;
        this.sections.push(section);
        return section;
    }

    addTotal(name: string|null = null): PivotTableRow {
        if (!this.total) {
            this.total = new PivotTableRow(this);
            this.total.classList.add('pivot-total');
            this.total.name = name;
            this.elem.createTFoot().appendChild(this.total.elem);
        }
        return this.total;
    }

    forEachRow(f: (row: PivotTableRow) => void): void {
        this.sections.forEach(section => {
            section.rows.forEach(f);
            if (section.subtotal) {
                f(section.subtotal);
            }
        });
        if (this.total) {
            f(this.total);
        }
    }
}

export class DataTable<T> extends Component<HTMLTableElement> {
    head: HTMLTableSectionElement;
    headRow: HTMLTableRowElement;
    body: HTMLTableSectionElement;
    columns: ((item: T) => Component<HTMLElement>|HTMLElement|string)[] = [];
    data: T[] = [];

    constructor() {
        super(document.createElement('table'));
        this.classList.add('data-table');
        this.head = this.elem.createTHead();
        this.headRow = this.head.insertRow();
        this.body = this.elem.createTBody();
    }

    addColumn(name: string, display: (item: T) => Component<any>|HTMLElement|string) {
        this.columns.push(display);
        const th = document.createElement('th');
        th.textContent = name;
        this.headRow.append(th);
    }

    pushHeader(label: string) {
        const row = this.body.insertRow();
        const cell = new Component(row.insertCell());
        cell.elem.colSpan = this.columns.length;
        cell.elem.textContent = label;
        cell.classList.add('data-table-header');
        return cell;
    }

    push(item: T) {
        this.data.push(item);
        const row = this.body.insertRow();
        for (let display of this.columns) {
            const cell = new Component(row.insertCell());
            const content = display(item);
            if (typeof content === 'string') {
                cell.elem.textContent = content;
            } else {
                cell.append(content);
            }
        }
        return row;
    }

    pushAll(items: T[]) {
        items.forEach(item => this.push(item));
    }

    clear() {
        this.body.innerHTML = '';
        this.data = [];
    }
}

export class RecordTable<K extends string|number|symbol, T> extends DataTable<T> {
    records = {} as Record<K, HTMLTableRowElement>;

    constructor(public keyOf: (item: T) => K) {
        super();
    }

    push(item: T) {
        const key = this.keyOf(item);
        if (this.records.hasOwnProperty(key)) {
            for (let i = 0; i < this.columns.length; i++) {
                const cell = new Component(this.records[key].cells[i]);
                const content = this.columns[i](item);
                if (typeof content === 'string') {
                    cell.elem.textContent = content;
                } else {
                    cell.append(content);
                }
            }
        } else {
            this.records[key] = super.push(item);
        }
        return this.records[key];
    }
}

