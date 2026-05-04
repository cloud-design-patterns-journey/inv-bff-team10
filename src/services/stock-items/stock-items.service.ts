import { Injectable } from '@nestjs/common';
import { StockItemsApi } from './stock-items.api';
import { StockItemModel } from '../../models';
import { get } from 'superagent';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

class StockItem {
    'id'?: string;
    'manufacturer'?: string;
    'picture'?: string;
    'name'?: string;
    'price'?: number;
    'stock'?: number;
}

@Injectable()
export class StockItemsService implements StockItemsApi {
    private breaker: CircuitBreaker;

    constructor(private configService: ConfigService) { }

    async listStockItems(): Promise<StockItemModel[]> {
        const serviceUrl = this.configService.get<string>('SERVICE_URL');

        const fetchStockItems = async () => {
            const res = await get(`${serviceUrl}/stock-items`)
                .set('Accept', 'application/json');
            return res.body;
        };

        if (!this.breaker) {
            this.breaker = new CircuitBreaker(fetchStockItems, {
                timeout: 3000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
            });
        }

        return new Promise((resolve, reject) => {
            this.breaker.fire()
                .then(data => resolve(this.mapStockItems(data)))
                .catch(err => reject(err));
        });
    }

    mapStockItems(data: StockItem[]): StockItemModel[] {
        return data.map(this.mapStockItem);
    }

    mapStockItem(item: StockItem): StockItemModel {
        return {
            id: item.id,
            name: item.name,
            stock: item.stock,
            unitPrice: item.price,
            picture: item.picture ?? 'https://via.placeholder.com/32.png',
            manufacturer: item.manufacturer,
        };
    }
}
