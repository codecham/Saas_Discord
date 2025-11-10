import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitemComponent } from './menuitem.component';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitemComponent, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenuComponent {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = this.devModel;
    }


    devModel: MenuItem[] = [
            {
                label: 'Home',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-objects-column', routerLink: ['/dashboard'] },
                ]
            },
            {
                label: 'Profile',
                items: [
                    { label: 'Profile', icon: 'pi pi-fw pi-user', routerLink: ['/profile'] },
                ]
            },
            {
                label: 'Server',
                items: [
                    { label: 'Members', icon: 'pi pi-fw pi-users', routerLink: ['/members'] },
                    { label: 'Roles', icon: 'pi pi-fw pi-id-card', routerLink: ['/roles'] },
                    { label: 'Channels', icon: 'pi pi-fw pi-hashtag', routerLink: ['/channels'] },
                ]
            },
            {
                label: 'Development',
                items: [
                    { label: 'Endpoints tester', icon: 'pi pi-fw pi-wave-pulse', routerLink: ['/endpoint-tester'] },
                ]
            },
            {
                label: 'uikit',
                items: [
                    { label: 'overview', icon: 'pi pi-objects-column', routerLink: ['/uikit/'] },
                    { label: 'stat-card', icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/stat-card'] },
                    { label: 'data-table', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/data-table'] },
                    { label: 'data-table-minimal', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/data-table-minimal'] },
                ]
            },
            {
                label: 'Demo UI Components',
                items: [
                    { label: 'Dashboard Demo', icon: 'pi pi-fw pi-home', routerLink: ['/demo/DashboardDemo'] },
                    { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', routerLink: ['/demo/formlayout'] },
                    { label: 'Input', icon: 'pi pi-fw pi-check-square', routerLink: ['/demo/input'] },
                    { label: 'Button', icon: 'pi pi-fw pi-mobile', class: 'rotated-icon', routerLink: ['/demo/button'] },
                    { label: 'Table', icon: 'pi pi-fw pi-table', routerLink: ['/demo/table'] },
                    { label: 'List', icon: 'pi pi-fw pi-list', routerLink: ['/demo/list'] },
                    { label: 'Tree', icon: 'pi pi-fw pi-share-alt', routerLink: ['/demo/tree'] },
                    { label: 'Panel', icon: 'pi pi-fw pi-tablet', routerLink: ['/demo/panel'] },
                    { label: 'Overlay', icon: 'pi pi-fw pi-clone', routerLink: ['/demo/overlay'] },
                    { label: 'Media', icon: 'pi pi-fw pi-image', routerLink: ['/demo/media'] },
                    { label: 'Menu', icon: 'pi pi-fw pi-bars', routerLink: ['/demo/menu'] },
                    { label: 'Message', icon: 'pi pi-fw pi-comment', routerLink: ['/demo/message'] },
                    { label: 'File', icon: 'pi pi-fw pi-file', routerLink: ['/demo/file'] },
                    { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/demo/charts'] },
                    { label: 'Timeline', icon: 'pi pi-fw pi-calendar', routerLink: ['/demo/timeline'] },
                    { label: 'Misc', icon: 'pi pi-fw pi-circle', routerLink: ['/demo/misc'] }
                ]
            },
            {
                label: 'Pages',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/pages'],
                items: [
                    {
                        label: 'Landing',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: ['/landing']
                    },
                    {
                        label: 'Auth',
                        icon: 'pi pi-fw pi-user',
                        items: [
                            {
                                label: 'Login',
                                icon: 'pi pi-fw pi-sign-in',
                                routerLink: ['/auth/login']
                            },
                            {
                                label: 'Error',
                                icon: 'pi pi-fw pi-times-circle',
                                routerLink: ['/auth/error']
                            },
                            {
                                label: 'Access Denied',
                                icon: 'pi pi-fw pi-lock',
                                routerLink: ['/auth/access']
                            }
                        ]
                    },
                    {
                        label: 'Not Found',
                        icon: 'pi pi-fw pi-exclamation-circle',
                        routerLink: ['/pages/notfound']
                    },
                    {
                        label: 'Empty',
                        icon: 'pi pi-fw pi-circle-off',
                        routerLink: ['/pages/empty']
                    }
                ]
            },
            {
                label: 'Hierarchy',
                items: [
                    {
                        label: 'Submenu 1',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 1.1',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 1.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.2', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 1.1.3', icon: 'pi pi-fw pi-bookmark' }
                                ]
                            },
                            {
                                label: 'Submenu 1.2',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [{ label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' }]
                            }
                        ]
                    },
                    {
                        label: 'Submenu 2',
                        icon: 'pi pi-fw pi-bookmark',
                        items: [
                            {
                                label: 'Submenu 2.1',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [
                                    { label: 'Submenu 2.1.1', icon: 'pi pi-fw pi-bookmark' },
                                    { label: 'Submenu 2.1.2', icon: 'pi pi-fw pi-bookmark' }
                                ]
                            },
                            {
                                label: 'Submenu 2.2',
                                icon: 'pi pi-fw pi-bookmark',
                                items: [{ label: 'Submenu 2.2.1', icon: 'pi pi-fw pi-bookmark' }]
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Get Started',
                items: [
                    {
                        label: 'Documentation',
                        icon: 'pi pi-fw pi-book',
                        routerLink: ['/documentation']
                    },
                    {
                        label: 'View Source',
                        icon: 'pi pi-fw pi-github',
                        url: 'https://github.com/primefaces/sakai-ng',
                        target: '_blank'
                    }
                ]
            }
        ];
    

    prodModel: MenuItem[] = [
            {
                label: 'Home',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-objects-column', routerLink: ['/dashboard'] },
                ]
            },
            {
                label: 'Profile',
                items: [
                    { label: 'Profile', icon: 'pi pi-fw pi-user', routerLink: ['/profile'] },
                ]
            },
            {
                label: 'Server',
                items: [
                    { label: 'Members', icon: 'pi pi-fw pi-users', routerLink: ['/members'] },
                    { label: 'Roles', icon: 'pi pi-fw pi-id-card', routerLink: ['/roles'] },
                    { label: 'Channels', icon: 'pi pi-fw pi-hashtag', routerLink: ['/channels'] },
                ]
            },
        ];
}
