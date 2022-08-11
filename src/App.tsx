import React from 'react';
import './App.css';

async function getAssets(count: number, offset: number) {
    const response = fetch(`https://api.coincap.io/v2/assets?limit=${count}&offset=${offset}`);
    return ((await response).json() as any);
}

const PAGE_SIZE: number = 25;

interface Asset {
    name: string;
    symbol: string;
    priceUsd: string;
}

interface AssetListItemProps {
    asset: Asset;
    isFavorite: boolean | undefined;
    toggleFavorite: () => void;
}

interface Favorites {
    [key: string]: boolean | undefined;
}

function AssetListItem({ asset, isFavorite, toggleFavorite }: AssetListItemProps) {
    return (
        <tr>
            <td>{asset.name}</td>
            <td>{asset.symbol}</td>
            <td>{Number.parseFloat(asset.priceUsd).toFixed(2)}</td>
            <td>
                <input
                    type='checkbox'
                    checked={isFavorite}
                    onChange={(event) => toggleFavorite()}
                />
            </td>
        </tr>
    )
}

function WatchListItem({ data }: any) {
    return (
        <tr>
            <td>{data.exchange}</td>
            <td>{data.base}</td>
            <td>{data.quote}</td>
            <td>{data.direction}</td>
            <td>{data.price}</td>
            <td>{data.volume}</td>
            <td>{Number.parseFloat(data.priceUsd).toFixed(2)}</td>
        </tr>
    )
}

function App() {
    const [page, setPage] = React.useState(1);
    const [assets, setAssets] = React.useState<Asset[]>([]);
    const [favorites, setFavorites] = React.useState<Favorites>({});
    const [watchlist, setWatchlist] = React.useState<any[]>([]);

    React.useEffect(() => {
        getAssets(PAGE_SIZE, page * PAGE_SIZE).then(assets => setAssets(assets.data));
    }, [page]);

    React.useEffect(() => {
        let socket = new WebSocket('wss://ws.coincap.io/trades/binance');
        let key = 0;
        let stack: any[] = [];

        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);

            if (!favorites[data.base.toLowerCase()])
                return

            data.key = ++key + data.base;
            stack.unshift(data);
            setWatchlist(stack.slice(0, 25))

            if (stack.length > 25)
                stack.pop();
        })

        socket.addEventListener('close', () => {
            socket = new WebSocket('wss://ws.coincap.io/trades/binance');
        });

        return () => {
            socket.close();
        }
    }, []);

    function toggleFavorite(asset: Asset) {
        const key = asset.name.toLowerCase();

        if (favorites[key])
            delete favorites[key]
        else
            favorites[key] = true;

        setFavorites(favorites);
    }

    return (
        <div className="App">
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>name</th>
                            <th>symbol</th>
                            <th>price</th>
                            <th>favorited</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset: Asset) =>
                            <AssetListItem
                                key={asset.symbol}
                                asset={asset}
                                isFavorite={favorites[asset.name.toLowerCase()]}
                                toggleFavorite={() => toggleFavorite(asset)}
                            />
                        )}
                    </tbody>
                </table>
            </div>

            <div>
                <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                >Previous</button>
                <button
                    onClick={() => setPage(page + 1)}
                    disabled={assets.length < PAGE_SIZE}
                >Next</button>
            </div>

            <div>
                <table>
                    <thead>
                        <tr>
                            <th>exchange</th>
                            <th>base</th>
                            <th>quote</th>
                            <th>direction</th>
                            <th>price</th>
                            <th>order size</th>
                            <th>price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {watchlist.map(item =>
                            <WatchListItem data={item} key={item.key} />
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default App;
